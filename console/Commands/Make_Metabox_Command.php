<?php

namespace GChild_Console\Commands;

use GChild_Console\Commands\Command_Helper;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\Output;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

class Make_Metabox_Command extends Command {

	/**
	 * @inheritDoc
	 */
	protected static $defaultName = 'make:mtbx'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	protected static $defaultDescription = 'Create a new custom metabox'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	public $metabox_name = 'Metabox name';

	/**
	 * @inheritDoc
	 */
	public $metabox_title = 'Metabox title';

	/**
	 * @inheritDoc
	 */
	public $metabox_post_type = 'Metabox post type';

	/**
	 * @inheritDoc
	 */
	public $metabox_position = 'Metabox position';

	/**
	 * @inheritDoc
	 */
	public $metabox_priority = 'Metabox plural';

	/**
	 * @inheritDoc
	 */
	public $metabox_fields = 'Metabox fields';

	/**
	 * Configure this command
	 *
	 * @return void
	 */
	public function configure() {
		$this->addArgument( 'position', InputArgument::OPTIONAL, 'Metabox slug (eg. "books")' );
		$this->addArgument( 'priority', InputArgument::OPTIONAL, 'Metabox singular string (eg. "Book")' );
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
		$this->metabox_name = $helper->ask( $input, $output, new Question( 'Metabox name (ex. "gt_book_authors"): ' ) );
		$this->metabox_title = $helper->ask( $input, $output, new Question( 'Metabox title (ex. "Book authors"): ' ) );
		$this->metabox_post_type = $helper->ask( $input, $output, new Question( 'Which post type is this metabox connected to? (ex. "gt_books"): ' ) );

		$position = $input->getArgument( 'position' ) ?: 'normal';
		$priority = $input->getArgument( 'priority' ) ?: 'default';

		$this->metabox_fields = $this->get_metabox_field_inputs( $input, $output, $helper );

		if ( ! is_string( $this->metabox_fields ) ) {
			$output->writeln( 'Something went wrong setting up metabox fields!' );
			return Command::FAILURE;
		}

		$this->metabox_name = implode(
			'_',
			array_map(
				fn( $part ) => strtolower( $part ),
				explode( ' ', $this->metabox_name )
			)
		);
		$this->metabox_title = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $this->metabox_title )
			)
		);
		$this->metabox_position = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $position )
			)
		);
		$this->metabox_priority = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $priority )
			)
		);

		$args = [
			$this->metabox_name,
			$this->metabox_title,
			$this->metabox_post_type,
			$this->metabox_position,
			$this->metabox_priority,
		];

		foreach ( $args as $arg ) {
			$string_wrong_formatted = preg_match( '/[^a-zA-Z_\s]+/', $arg );

			if ( $string_wrong_formatted ) {
				$output->writeln( 'Only use English, spaces and underscores characters in fields!' );
				return Command::FAILURE;
			}
		}

		$output->writeln( 'Setting up metabox. Please wait!' );

		$was_successful = $this->setup_metabox( $output );

		if ( ! $was_successful ) {
			$output->writeln(
				[
					'',
					'====== ERROR ======',
					'The metabox already exists!',
					'',
				]
			);
			return Command::FAILURE;
		}

		$output->writeln( sprintf( 'All done! Metabox: %s is now set up !', $this->metabox_title ) );
		return Command::SUCCESS;
	}

	/**
	 * Gets metabox fields from user input
	 *
	 * @return bool
	 */
	public function get_metabox_field_inputs( InputInterface $input, OutputInterface $output, $helper) {
		$fields_string = '';
		$is_first_question = false;

		while ( true ) {
			if ( $is_first_question === true ) {
				$make_new_field = $helper->ask( $input, $output, new Question( 'Do you want to create another field? (y/n):' ) );
				if ( $make_new_field === 'n' ) {
					break;
				}
			} else {
				$is_first_question = true;
			}

			$field_type = $helper->ask( $input, $output, new Question( 'Add field to metabox: (text / checkbox) : ' ) );
			if ( empty( $field_type ) || $field_type !== 'text' && $field_type !== 'checkbox' ) {
				$output->writeln( 'ERROR: Field type can not be empty or needs to be (text / checkbox)' );
				continue;
			}

			$field_name = $helper->ask( $input, $output, new Question( 'Field name (ex. "field_book_writer") : ' ) );
			if ( empty( $field_name ) ) {
				$output->writeln( 'ERROR: Field name can not be empty.' );
				continue;
			}

			$field_label = $helper->ask( $input, $output, new Question( 'Field title (ex. "Writers") : ' ) );
			if ( empty( $field_label ) ) {
				$output->writeln( 'ERROR: Field title can not be empty.' );
				continue;
			}

			$field_options_string = '';
			if ( $field_type === 'checkbox' ) {
				$field_options_string = $this->get_field_options_string( $input, $output, $helper );
			}

			$field_tooltip = $helper->ask( $input, $output, new Question( 'Field tooltip/description (ex. "Book number that needs...") : ' ) );
			if ( empty( $field_tooltip ) ) {
				$field_tooltip = '';
			} else {
				$field_tooltip = "
				'tooltip' => esc_html__( '" . $field_tooltip . "', 'g-theme-child' )";
			}

			$field_array_string = "'" . $field_name . "' => [
						'label'   => esc_html__( '" . $field_label . "', 'g-theme-child' ),
						'type'    => '" . $field_type . "'," . $field_options_string . $field_tooltip . '
					],';

			$fields_string .= $field_array_string;
		}

		return $fields_string;
	}

	public function get_field_options_string( InputInterface $input, OutputInterface $output, $helper) {
		$field_options_string = "'options' => [\n	";
		$is_first_option = false;

		while ( true ) {
			if ( $is_first_option === true ) {
				$make_new_field = $helper->ask( $input, $output, new Question( 'Do you want to create another option for the checkbox field? (y/n):' ) );
				if ( $make_new_field === 'n' ) {
					break;
				}
			} else {
				$is_first_option = true;
			}

			$option_name = $helper->ask( $input, $output, new Question( 'Checkbox option: (ex. "HC Andersen") : ' ) );
			if ( empty( $option_name ) ) {
				$output->writeln( 'ERROR: Checkbox option name can not be empty.' );
				continue;
			}

			$field_array_string = "	'" . str_replace( ' ', '_', strtolower( $option_name ) ) . "' => esc_html__( '" . $option_name . "', 'g-theme-child' ),\n";

			$field_options_string .= $field_array_string;
		}

		return $field_options_string . '],';
	}

	/**
	 * Clone the new module
	 *
	 * @return bool
	 */
	public function setup_metabox( OutputInterface $output ) {
		$metaboxs_file_path = __DIR__ . '/../../inc/Customization/Utils/Child_Metaboxes.php';
		$gchild_metabox_file_contents = file_get_contents( $metaboxs_file_path );

		$metabox_registered_in_file = strpos( $gchild_metabox_file_contents, $this->metabox_name );
		if ($metabox_registered_in_file !== false) return false;

		$post_types_file_path = __DIR__ . '/../../inc/Customization/Utils/Child_Post_Types.php';
		$gchild_post_type_file_contents = file_get_contents( $post_types_file_path );

		$post_type_registered_in_file = strpos( $gchild_post_type_file_contents, $this->metabox_post_type );
		if ($post_type_registered_in_file !== false) $output->writeln( 'Post type does is not set up' );

		$gchild_metabox_file_contents = str_replace(
			[
				'/* METABOX */',
			],
			[
				"/* METABOX */
			'" . $this->metabox_name . "' => [
				'title'     => esc_html__( '" . $this->metabox_title . "', 'g-theme-child' ),
				'post_type' => '" . $this->metabox_post_type . "',
				'position'  => '" . $this->metabox_position . "',
				'priority'  => '" . $this->metabox_priority . "',
				'fields'    => [
					" . $this->metabox_fields . '
				]
			],',
			],
			$gchild_metabox_file_contents
		);

		file_put_contents( $metaboxs_file_path, $gchild_metabox_file_contents );

		return true;
	}
}
