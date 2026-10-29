import assert from 'node:assert/strict';
import { mkdtemp, chmod, writeFile, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import laravel from 'laravel-vite-plugin';
import { createServer } from 'vite';
import { resolveViteServer } from './vite-server.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'gchild-vite-server-'));
const originalPath = process.env.PATH;
const occupied = net.createServer();
let vite;

try {
	await writeFile(
		path.join(directory, 'wp'),
		`#!${process.execPath}\nif (process.argv.slice(2).join(' ') !== 'option get siteurl') process.exit(1);\nprocess.stdout.write('https://remote.example.test/wordpress/\\n');\n`,
	);
	await chmod(path.join(directory, 'wp'), 0o755);
	process.env.PATH = `${directory}${path.delimiter}${originalPath}`;
	const server = await resolveViteServer({}, directory);
	assert.ok(server.port >= 18000 && server.port <= 18020);
	assert.equal(server.host, '127.0.0.1');
	assert.equal(server.origin, `https://remote.example.test:${server.port - 10000}`);
	assert.equal(server.ws.clientPort, server.port - 10000);
	assert.equal(server.ws.protocol, 'wss');
	assert.equal(server.ws.host, 'remote.example.test');
	assert.equal(server.cors.origin, 'https://remote.example.test');
	assert.deepEqual(server.allowedHosts, ['remote.example.test']);
	assert.equal(server.strictPort, true, 'Vite must not silently change a port after calculating the proxy URL.');

	await new Promise((resolve, reject) => {
		occupied.once('error', reject);
		occupied.listen(server.port, '127.0.0.1', resolve);
	});
	const next = await resolveViteServer({}, directory);
	assert.ok(next.port > server.port, 'Discovery must skip occupied ports.');
	assert.equal(next.ws.clientPort, next.port - 10000);

	await writeFile(path.join(directory, 'app.js'), '');
	vite = await createServer({
		configFile: false,
		root: directory,
		logLevel: 'silent',
		plugins: [laravel({ input: 'app.js', hotFile: path.join(directory, 'vite.hot'), detectTls: false })],
		server: next,
	});
	await vite.listen();
	assert.equal(await readFile(path.join(directory, 'vite.hot'), 'utf8'), next.origin);
	const response = await fetch(`http://127.0.0.1:${next.port}/@vite/client`, {
		headers: { Origin: 'https://remote.example.test' },
	});
	assert.equal(response.headers.get('access-control-allow-origin'), 'https://remote.example.test');
	const client = await response.text();
	assert.ok(client.includes('const socketProtocol = "wss"'));
	assert.ok(client.includes(`const hmrPort = ${next.ws.clientPort}`));
	assert.ok(client.includes('"remote.example.test"'));
	await vite.close();
	vite = undefined;

	const local = await resolveViteServer(
		{ WP_SITE_URL: 'http://local.test', VITE_DEV_SERVER_URL: 'http://localhost:5173', VITE_PORT: '5173' },
		directory,
	);
	assert.equal(local.origin, 'http://localhost:5173');
	assert.equal(local.ws.protocol, 'ws');
	assert.equal(local.ws.clientPort, 5173);
	assert.equal(local.cors.origin, 'http://local.test');
	await assert.rejects(resolveViteServer({ WP_SITE_URL: 'https://example.test', VITE_PORT: 'invalid' }, directory));
	await assert.rejects(resolveViteServer({ WP_SITE_URL: 'https://example.test', VITE_PORT: '5173' }, directory));

	process.env.PATH = directory;
	await rm(path.join(directory, 'wp'));
	const fallback = await resolveViteServer({}, directory);
	assert.deepEqual(fallback, { host: '127.0.0.1' });
	await writeFile(path.join(directory, 'wp'), `#!${process.execPath}\nprocess.exit(1);\n`);
	await chmod(path.join(directory, 'wp'), 0o755);
	assert.deepEqual(await resolveViteServer({}, directory), fallback, 'A failing WP-CLI must also use local defaults.');
	process.env.PATH = originalPath;
	const hotFile = path.join(directory, 'local.hot');
	vite = await createServer({
		configFile: false,
		root: directory,
		logLevel: 'silent',
		plugins: [laravel({ input: 'app.js', hotFile, detectTls: false })],
		server: fallback,
	});
	await vite.listen();
	const localUrl = `http://127.0.0.1:${vite.httpServer.address().port}`;
	assert.equal(await readFile(hotFile, 'utf8'), localUrl, 'The hot file must use the actual local listener.');
	const localResponse = await fetch(`${localUrl}/@vite/client`, { headers: { Origin: 'http://gchild-vite.test' } });
	assert.equal(localResponse.status, 200);
	assert.equal(localResponse.headers.get('access-control-allow-origin'), 'http://gchild-vite.test');
	assert.ok(!(await localResponse.text()).includes('const socketProtocol = "wss"'));
	await vite.close();
	vite = undefined;
	assert.equal(
		(await resolveViteServer({ WP_SITE_URL: 'https://example.test', VITE_PORT: '18020' }, directory)).ws.clientPort,
		8020,
	);
	console.log('Automatic WordPress discovery, proxy mapping, local fallback, and port conflict checks passed.');
} finally {
	process.env.PATH = originalPath;
	if (vite) {
		await vite.close();
	}

	if (occupied.listening) {
		await new Promise((resolve) => occupied.close(resolve));
	}

	await rm(directory, { recursive: true, force: true });
}
