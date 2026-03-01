- All planned work is represented as Epic files under `epics/`
- Exactly one Epic may be active at a time
- Active epics are in `epics/active/`.
- Claude must only work on the active Epic.
- If no Epic is active, do not perform work. Ask for clarification.
- Complete tasks in order unless explicitly told otherwise
- The following is the iterative process, the _WORKING AGREEMENT_, for working through sub tasks that must be followed:
  1. If we're moving on to a new sub task, then read the sub-task. If we're working ad hoc on a fix or small change, there's no reason to consult the task list.
  2. Ask any questions if things are unclear
  3. Always start by writing tests (test first). The tests will represent the first real embodiment of the requirements of the task.
  4. Complete the sub task.
  5. Ensure test coverage reaches 85% for new/changed code. Add missing tests if needed.
  6. Once the sub task is complete, run all tests and verify they pass.
  7. If we're working from a task/sub task list, update the task file — check off completed sub-task checkboxes.
  8. Commit the changes, including and task file updates, locally. DO NOT push anything.
     a. Each commit should include a commit message that reflects the task details as well as the work done.
     b. Multiple commits per task are fine, but do not combine multiple tasks in a single commit.
     c. If we're working from the task document. the commit must include the updated task file showing the completed checkbox(es).
