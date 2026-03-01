# Working Agreement

## Epic & Task Management

- All planned work is represented as epics under `epics/`.
- Exactly one epic may be active at a time. Active epics live in `epics/active/`.
- Only work on the active epic. If no epic is active, ask for clarification.
- Complete tasks in order unless explicitly told otherwise.

## Iterative Work Process

When working through a task:

1. **Read the task.** If starting a new task, read the task file first. For ad hoc fixes or small changes, skip this.
2. **Ask questions.** If anything is unclear, ask before writing code.
3. **Write tests first.** Tests embody the requirements. Write them before the implementation. (Skip for pure infrastructure tasks where verification is running scripts, not tests.)
4. **Implement.** Complete the work, making sure tests pass.
5. **Check coverage.** Ensure test coverage reaches 85% for new or changed code. Add missing tests if needed.
6. **Run all tests.** Verify the full test suite passes, not just the new tests.
7. **Update the task file.** Check off completed sub-task checkboxes.
8. **Commit.** See commit rules below.

## Commits

Every commit must be **self-contained and working**. The project must build, pass tests, and pass lint both before and after every commit.

A commit should include everything related to the change: code, tests, task file updates, and any config changes. Nothing should be left half-done.

- **Multiple commits per task** are fine when each commit is independently self-contained.
- **Never combine work from different tasks** in a single commit.
- Commit messages should reflect what was done and reference the task (e.g., "task-002: implement keypair generation with tests").
- Commit locally. Do not push unless explicitly asked.
