import { execFileSync } from 'node:child_process';
import net from 'node:net';

/**
 * Find an available listener covered by the existing HTTPS proxy.
 *
 * @returns {Promise<number>} Internal HTTP port.
 */
async function findProxyPort() {
	for (let port = 18000; port <= 18020; port += 1) {
		const available = await new Promise((resolve, reject) => {
			const probe = net.createServer();
			probe.once('error', (error) => {
				if (error.code === 'EADDRINUSE') {
					resolve(false);
				} else {
					reject(error);
				}
			});
			probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
		});

		if (available) {
			return port;
		}
	}

	throw new Error('No free Vite proxy port between 18000 and 18020. Stop an unused dev server and retry.');
}

/**
 * Reuse the former Mix WordPress discovery and HTTPS proxy port convention.
 *
 * @param {Record<string, string>} env Optional environment overrides.
 * @param {string} root Theme directory for WP-CLI discovery.
 * @returns {Promise<object>} Native Vite server settings.
 */
export async function resolveViteServer(env, root) {
	let siteUrl = env.WP_SITE_URL;

	if (!siteUrl) {
		try {
			siteUrl = execFileSync('wp', ['option', 'get', 'siteurl'], {
				cwd: root,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
				timeout: 10000,
			}).trim();
		} catch {
			console.warn('WP-CLI could not read siteurl; using the local Vite dev server, as with the old hot mode.');

			return { host: '127.0.0.1' };
		}
	}

	const site = new URL(siteUrl);
	const port = env.VITE_PORT ? Number(env.VITE_PORT) : env.VITE_DEV_SERVER_URL ? 5173 : await findProxyPort();

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('VITE_PORT must be an integer between 1 and 65535.');
	}

	if (!env.VITE_DEV_SERVER_URL && (port < 18000 || port > 18020)) {
		throw new Error(
			'Automatic proxy mode requires an internal port between 18000 and 18020. Set VITE_DEV_SERVER_URL for another setup.',
		);
	}

	const publicUrl = new URL(env.VITE_DEV_SERVER_URL || `https://${site.hostname}:${port - 10000}`);

	if (![site.protocol, publicUrl.protocol].every((protocol) => ['http:', 'https:'].includes(protocol))) {
		throw new Error('WordPress and Vite URLs must use HTTP or HTTPS.');
	}

	return {
		host: '127.0.0.1',
		port,
		strictPort: true,
		origin: publicUrl.origin,
		cors: { origin: site.origin },
		allowedHosts: [publicUrl.hostname],
		ws: {
			protocol: publicUrl.protocol === 'https:' ? 'wss' : 'ws',
			host: publicUrl.hostname,
			clientPort: Number(publicUrl.port || (publicUrl.protocol === 'https:' ? 443 : 80)),
		},
	};
}
