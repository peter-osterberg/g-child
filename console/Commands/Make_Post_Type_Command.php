<?php

namespace GChild_Console\Commands;

use GChild_Console\Commands\Command_Helper;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

class Make_Post_Type_Command extends Command {

	/**
	 * @inheritDoc
	 */
	protected static $defaultName = 'make:cpt'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	protected static $defaultDescription = 'Create a new custom post type'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	public $post_type_name = 'Post type name';

	/**
	 * @inheritDoc
	 */
	public $post_type_slug = 'Post type slug';

	/**
	 * @inheritDoc
	 */
	public $post_type_singular = 'Post type singular';

	/**
	 * @inheritDoc
	 */
	public $post_type_plural = 'Post type plural';

	/**
	 * @inheritDoc
	 */
	public $post_type_icon = 'dashicons-image-filter';

	/**
	 * @inheritDoc
	 */
	public $post_type_fields = 'Post type fields';

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
		$this->post_type_name = $helper->ask( $input, $output, new Question( 'Post type name (eg. "gt_books"): ' ) );
		$this->post_type_slug = $helper->ask( $input, $output, new Question( 'Post type slug (eg. "books"): ' ) );
		$this->post_type_singular = $helper->ask( $input, $output, new Question( 'Post type singular string (eg. "Book"): ' ) );
		$this->post_type_plural = $helper->ask( $input, $output, new Question( 'Post type plural string (eg. "Books"): ' ) );
		$post_type_icon = $helper->ask( $input, $output, new Question( 'Icon fom dashicons - eg. "dashicons-image-filter" (optional): ' ) );

		if ( ! empty( $post_type_icon ) ) {
			$this->post_type_icon = $post_type_icon;
		}

		$this->post_type_name = implode(
			'_',
			array_map(
				fn( $part ) => strtolower( $part ),
				explode( ' ', $this->post_type_name )
			)
		);
		$this->post_type_singular = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $this->post_type_singular )
			)
		);
		$this->post_type_plural = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $this->post_type_plural )
			)
		);

		$args = [
			$this->post_type_name,
			$this->post_type_slug,
			$this->post_type_singular,
			$this->post_type_plural,
		];

		foreach ( $args as $arg ) {
			$string_is_english = preg_match( '/[^a-zA-Z_]+/', $arg );

			if ( $string_is_english ) {
				$output->writeln( 'Only use English and "_" characters for the post type name!' );
				return Command::FAILURE;
			}
		}

		$output->writeln( 'Setting up post type. Please wait!' );

		$was_successful = $this->setup_post_type();

		if ( ! $was_successful ) {
			$output->writeln(
				[
					'',
					'====== ERROR ======',
					'The post type already exists!',
					'',
				]
			);
			return Command::FAILURE;
		}

		$output->writeln( "\n\n" . sprintf( 'All done! Post type: %s is now set up !', $this->post_type_name ) );
		return Command::SUCCESS;
	}

	/**
	 * Clone the new module
	 *
	 * @return bool
	 */
	public function setup_post_type() {
		$post_types_file_path = __DIR__ . '/../../inc/Customization/Utils/Child_Post_Types.php';
		$gchild_post_type_file_contents = file_get_contents( $post_types_file_path );

		$post_type_registered_in_file = strpos( $gchild_post_type_file_contents, $this->post_type_name );
		if ($post_type_registered_in_file !== false) return false;

		$gchild_post_type_file_contents = str_replace(
			[
				'/* POST_TYPE */',
			],
			[
				"/* POST_TYPE */
			[
				'name'     => '" . $this->post_type_name . "',
				'slug'     => '" . $this->post_type_slug . "',
				'singular' => esc_html__( '" . $this->post_type_singular . "', 'g-theme-child' ),
				'plural'   => esc_html__( '" . $this->post_type_plural . "', 'g-theme-child' ),
				'options'  => [
					'public'    => true,
					'show_ui'   => true,
					'menu_icon' => '" . $this->post_type_icon . "',
				],
			],",
			],
			$gchild_post_type_file_contents
		);

		file_put_contents( $post_types_file_path, $gchild_post_type_file_contents );

		return true;
	}
}
