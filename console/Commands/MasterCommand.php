<?php

namespace GChild_Console\Commands;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Helper\QuestionHelper;
use Symfony\Component\Console\Question\ChoiceQuestion;

class MasterCommand extends Command {
	// phpcs:ignore
	protected static $defaultName = 'manage';

	protected function configure() {
		$this
			->setDescription( 'Master command to manage various tasks.' )
			->setHelp( 'This command allows you to select and execute various management tasks.' );
	}

	protected function execute( InputInterface $input, OutputInterface $output): int {
		// Retrieve the helper for interactive questions
		/** @var QuestionHelper $helper */
		$helper = $this->getHelper( 'question' );

		// Define the available actions
		$actions = [
			'Insert Module from library',
			'Make Module',
			'Make Post Type',
			'Make Taxonomy',
			'Make Metabox',
			'Exit',
		];

		// Create a ChoiceQuestion instance
		$question = new ChoiceQuestion(
			'Please select an action (default: Exit): ',
			$actions,
			count( $actions ) - 1 // Default to 'Exit'
		);
		$question->setErrorMessage( 'Invalid selection.' );

		// Ask the user to select an action
		$selected_action = $helper->ask( $input, $output, $question );

		// Handle the user's selection
		switch ( $selected_action ) {
			case 'Insert Module from library':
				return $this->runSubCommand( 'insert:module', $input, $output );
			case 'Make Module':
				return $this->runSubCommand( 'make:module', $input, $output );
			case 'Make Post Type':
				return $this->runSubCommand( 'make:cpt', $input, $output );
			case 'Make Taxonomy':
				return $this->runSubCommand( 'make:tax', $input, $output );
			case 'Make Metabox':
				return $this->runSubCommand( 'make:mtbx', $input, $output );
			case 'Exit':
			default:
				$output->writeln( 'Goodbye!' );
				return Command::SUCCESS;
		}
	}

	/**
	 * Executes a sub-command programmatically.
	 *
	 * @param string $commandName The name of the command to execute.
	 * @param InputInterface $input
	 * @param OutputInterface $output
	 * @return int The exit status code.
	 */
	private function runSubCommand( string $command_name, InputInterface $input, OutputInterface $output): int {
		// Get the application instance
		$application = $this->getApplication();

		if ( ! $application ) {
			$output->writeln( '<error>Application instance not found.</error>' );
			return Command::FAILURE;
		}

		// Find the command by name
		$command = $application->find( $command_name );

		// Create a new ArrayInput for the sub-command
		$sub_input = new ArrayInput( [] );

		// Run the sub-command
		return $command->run( $sub_input, $output );
	}
}
