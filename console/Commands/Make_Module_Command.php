<?php

namespace GChild_Console\Commands;

use GChild_Console\Commands\Command_Helper;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

class Make_Module_Command extends Command {

	/**
	 * @inheritDoc
	 */
	protected static $defaultName = 'make:module'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	public $module_icon = 'umbrella';

	/**
	 * @inheritDoc
	 */
	public $module_name = 'Module name';

	/**
	 * @inheritDoc
	 */
	public $class_name = 'Class name';

	/**
	 * @inheritDoc
	 */
	public $module_fields = 'Module fields';

	/**
	 * @inheritDoc
	 */
	public $new_module_dir = '';

	/**
	 * Configure this command
	 *
	 * @return void
	 */
	public function configure() {
		$this
			->setDescription( 'fields' )
			->setHelp( 'This command allows you to get user input after the command is executed.' );
	}

	/**
	 * Execute the command
	 *
	 * @param \Symfony\Component\Console\Input\InputInterface $input
	 * @param \Symfony\Component\Console\Output\OutputInterface $output
	 * @return int
	 */
	protected function execute( InputInterface $input, OutputInterface $output ): int {
		/** @var Symfony\Component\Console\Helper\QuestionHelper $helper */
		$helper = $this->getHelper( 'question' ); // Question helper
		$this->module_name = $helper->ask( $input, $output, new Question( 'Module name (eg. "Image text"): ' ) );
		$this->module_name = ucfirst(
			implode(
				' ',
				array_map(
					fn( $part ) =>   strtolower( $part ),
					explode( '_', $this->module_name )
				)
			)
		);
		$new_module_icon = $helper->ask( $input, $output, new Question( 'Module fa-icon (eg. "umbrella"): ' ) );

		$this->class_name = implode(
			'_',
			array_map(
				fn( $part ) =>  ucwords( strtolower( $part ) ),
				explode( ' ', $this->module_name )
			)
		);

		$this->class_name = implode(
			'_',
			array_map(
				fn( $part ) =>  ucwords( strtolower( $part ) ),
				explode( '_', $this->class_name )
			)
		);

		if ( ! empty( $new_module_icon ) ) {
			$this->module_icon = $new_module_icon;
		}

		$this->new_module_dir = __DIR__ . '/../../inc/Modules/' . $this->class_name;
		if ( is_dir( $this->new_module_dir ) ) {
			$output->writeln(
				[
					'',
					'====== ERROR ======',
					'The module already exists',
					'',
				]
			);
			return Command::FAILURE;
		}

		$output->writeln( 'Setting up module. Please wait!' );

		$was_successful = $this->setup_module();

		if ( ! $was_successful ) {
			$output->writeln(
				[
					'',
					'====== ERROR ======',
					'The module already exists, or no dummy module folder was found!',
					'',
				]
			);
			return Command::FAILURE;
		}

		$output->writeln( 'All done! Check out your awesome new module!' );
		return Command::SUCCESS;
	}

	/**
	 * Clone the new module
	 *
	 * @return bool
	 */
	public function setup_module() {
		// Create module manager if it doesn't exist
		$dummy_dir = __DIR__ . '/Dummy';

		if ( is_dir( $dummy_dir ) ) {
			Command_Helper::get_or_create_folder( $this->new_module_dir, $dummy_dir );

			// Setting up MODULE_NAME.php file
			$module_file_contents = file_get_contents( $dummy_dir . '/Dummy.php' );
			$module_file_contents = str_replace(
				[
					'namespace GTheme_Child\Modules\Dummy;',
					'dummy module',
					'class Dummy',
				],
				[
					'namespace GTheme_Child\Modules\\' . $this->class_name . ';',
					$this->module_name . ' module',
					'class ' . $this->class_name,
				],
				$module_file_contents
			);

			file_put_contents( $this->new_module_dir . '/' . $this->class_name . '.php', $module_file_contents );

			// Setting up MODULE_NAME_CONTROLLER.php file
			$module_controller_file_contents = file_get_contents( $dummy_dir . '/Dummy_Controller.php' );
			$module_controller_file_contents = str_replace(
				[
					'namespace GTheme_Child\Modules\Dummy;',
					'dummy module, copy this to create your own',
					'protected $icon = ' . "'umbrella'" . ';',
					'Dummy_Controller',
					"return esc_html__( 'Dummy module', 'g-theme-child' );",
					"return esc_html__( 'Dummy module description', 'g-theme-child' );",
				],
				[
					'namespace GTheme_Child\Modules\\' . $this->class_name . ';',
					$this->module_name . ' module',
					'protected $icon = ' . "'" . $this->module_icon . "'" . ';',
					$this->class_name . '_Controller',
					"return esc_html__( '" . $this->module_name . "', 'g-theme-child' );",
				],
				$module_controller_file_contents
			);

			file_put_contents( $this->new_module_dir . '/' . ucfirst( $this->class_name ) . '_Controller.php', $module_controller_file_contents );

			// Setting up fields.php file
			$module_fields_file_contents = file_get_contents( $dummy_dir . '/fields.php' );
			file_put_contents( $this->new_module_dir . '/fields.php', $module_fields_file_contents );

			// Setting up template.php file
			$module_template_file_contents = file_get_contents( $dummy_dir . '/template.php' );
			$module_template_file_contents = str_replace( '\GTheme_Child\Modules\Dummy\Dummy', 'GTheme_Child\Modules\\' . $this->class_name . '\\' . $this->class_name, $module_template_file_contents );
			file_put_contents( $this->new_module_dir . '/template.php', $module_template_file_contents );

			// Set up /resources folder with the kebab-case asset names expected by vite.config.mjs
			mkdir( $this->new_module_dir . '/resources', 0775 );
			mkdir( $this->new_module_dir . '/resources/scss', 0775 );
			$module_fields_file_contents = file_get_contents( $dummy_dir . '/resources/scss/dummy.scss' );
			file_put_contents(
				$this->new_module_dir . '/resources/scss/' . str_replace( '_', '-', strtolower( $this->class_name ) ) . '.scss',
				$module_fields_file_contents
			);
			mkdir( $this->new_module_dir . '/resources/js', 0775 );
			$module_fields_file_contents = file_get_contents( $dummy_dir . '/resources/js/dummy.js' );
			file_put_contents(
				$this->new_module_dir . '/resources/js/' . str_replace( '_', '-', strtolower( $this->class_name ) ) . '.js',
				$module_fields_file_contents
			);

			// Add module to theme
			$customization_file = __DIR__ . '/../../inc/Customization/Modules.php';
			$module_theme_contents = file_get_contents( $customization_file );
			$module_theme_contents = str_replace(
				[
					'/* CONTROLLERS BELOW */',
					'/* NEW MODULES BELOW */',
				],
				[
					'/* CONTROLLERS BELOW */' . PHP_EOL . 'use GTheme_Child\Modules\\' . $this->class_name . '\\' . $this->class_name . '_Controller;',
					'/* NEW MODULES BELOW */' . PHP_EOL . "\t\t\t\t" . $this->class_name . '_Controller::class,',
				],
				$module_theme_contents
			);

			file_put_contents( $customization_file, $module_theme_contents );

			return true;
		} else {
			return false;
		}
	}
}
