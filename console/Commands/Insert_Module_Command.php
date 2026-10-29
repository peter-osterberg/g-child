<?php

namespace GChild_Console\Commands;

use Symfony\Component\Console\Question\ChoiceQuestion;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Helper\QuestionHelper;

class Insert_Module_Command extends Command {
	/**
	 * @inheritDoc
	 */
	protected static $defaultName = 'insert:module'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	private $new_module_dir = '';

	/**
	 * Configure this command
	 *
	 * @return void
	 */
	public function configure() {
		$this
		->setDescription( 'Copy a module from one folder to another' )
		->setHelp( 'This command copies a module and registers it in the system.' );
	}

	/**
	 * Execute the command
	 *
	 * @param \Symfony\Component\Console\Input\InputInterface $input
	 * @param \Symfony\Component\Console\Output\OutputInterface $output
	 * @return int
	 */
	protected function execute( InputInterface $input, OutputInterface $output): int {
		/** @var QuestionHelper $helper */
		$helper = $this->getHelper( 'question' );

		$available_modules = $this->get_available_modules();
		if ( empty( $available_modules ) ) {
			$output->writeln( '<error>No modules available to copy!</error>' );
			return Command::FAILURE;
		}

		$question = new ChoiceQuestion(
			'Please select a module to copy:',
			$available_modules
		);
		$question->setErrorMessage( 'Invalid module selected.' );

		$module_name = $helper->ask( $input, $output, $question );
		$module_name = ucfirst( strtolower( trim( $module_name ) ) );

		$this->new_module_dir = __DIR__ . '/../../inc/Modules/' . $module_name;

		if ( is_dir( $this->new_module_dir ) ) {
			$output->writeln( '<error>The module already exists!</error>' );
			return Command::FAILURE;
		}

		$source_dir = __DIR__ . '/Modules/' . $module_name;

		if ( ! is_dir( $source_dir ) ) {
			$output->writeln( '<error>Source module not found!</error>' );
			return Command::FAILURE;
		}

		$output->writeln( 'Copying module...' );

		$this->copy_directory( $source_dir, $this->new_module_dir );

		$this->register_module_in_theme( $module_name );

		$output->writeln( '<info>Module copied and registered successfully!</info>' );

		return Command::SUCCESS;
	}

	/**
	 * Get available modules
	 *
	 * @return array
	 */
	private function get_available_modules(): array {
		$modules_dir = __DIR__ . '/Modules';
		if ( ! is_dir( $modules_dir ) ) {
			return [];
		}

		$modules = array_filter(
			scandir( $modules_dir ),
			function ( $item) use ( $modules_dir) {
				return $item !== '.' && $item !== '..' && is_dir( $modules_dir . '/' . $item );
			}
		);

		return array_values( $modules );
	}

	/**
	 * Copy a directory
	 *
	 * @param string $source
	 * @param string $destination
	 * @return void
	 */
	private function copy_directory( $source, $destination) {
		mkdir( $destination, 0775, true );

		foreach ( scandir( $source ) as $file ) {
			if ( in_array( $file, ['.', '..'], true ) ) {
				continue;
			}

			$source_path = $source . '/' . $file;
			$destination_path = $destination . '/' . $file;

			if ( is_dir( $source_path ) ) {
				$this->copy_directory( $source_path, $destination_path );
			} else {
				copy( $source_path, $destination_path );
			}
		}
	}

	/**
	 * Register module in theme
	 *
	 * @param string $module_name
	 * @return void
	 */
	private function register_module_in_theme( $module_name) {
		$customization_file = __DIR__ . '/../../inc/Customization/Modules.php';

		if ( ! file_exists( $customization_file ) ) {
			return;
		}

		$module_theme_contents = file_get_contents( $customization_file );

		$module_theme_contents = str_replace(
			[
				'/* CONTROLLERS BELOW */',
				'/* NEW MODULES BELOW */',
			],
			[
				'/* CONTROLLERS BELOW */' . PHP_EOL . 'use GTheme_Child\\Modules\\' . $module_name . '\\' . $module_name . '_Controller;',
				'/* NEW MODULES BELOW */' . PHP_EOL . "\t\t\t\t" . $module_name . '_Controller::class,',
			],
			$module_theme_contents
		);

			file_put_contents( $customization_file, $module_theme_contents );
	}
}
