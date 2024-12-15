# Contributing Guidelines

Please remember to follow these contributing guidelines when committing or submitting a merge request to the EAS.js repository.

## Commit Message Guidelines

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Example — `fix: remove unused dependency is-even`

Any line of the commit message should not be longer 100 characters. This allows the message to be easier to read on GitHub
as well as in various git tools.

#### Type

Adding these types to the front of your commit message allows us to easily review what was changed in any given commit:

* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation, or changes
  to project configuration files.
* **deps**: Changes to dependencies.
* **docs**: Documentation only changes.
* **feat**: A new feature.
* **fix**: A bug fix.
* **merge**: Merging changes from one branch into another branch.
* **perf**: A code change that improves performance.
* **refactor**: A code change that neither fixes a bug nor adds a feature.
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
* **test**: Adding missing tests.

#### Scope

The scope is optional and could be anything specifying place of the commit change. For example `nsis`, `mac`, `linux`,
etc...

#### Subject

The subject contains succinct description of the change:

* use the imperative, present tense: `change` not `changed` nor `changes`,
* don't capitalize first letter,
* no dot (.) at the end.

#### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

#### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference GitLab issues
that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit
message is then used for this.

## Merge Request Guidelines

Merge requests are the best way to propose changes to the EAS.js codebase. We actively welcome your merge requests.

#### Forking

We require that all changes be made in a feature-branch and not in the master branch of a forked repository. This makes
it easier to submit multiple merge requests without confusion, and allows us to quickly glance at the branch name to get
an idea of what is being changed.

#### Branching

Branches should generally be prefixed with the type of change being made, followed by a short description of the change. For
example, a branch for a new feature adding support for the notification endpoint could be `feat/decoder`.

#### Committing

Please follow the **Commit Message Guidelines** above when writing commit messages.

#### Force Pushing

Force pushing to your own feature branch is allowed, but should be avoided if possible. Acceptable instances of force
pushing would be to squash commits in order to maintain a clean tree, or to update the branch with changes from master.

#### Tests

When contributing to this repository, it is heavily encouraged that your changes are covered by tests. For example, If you
are adding a new feature, please add tests for that feature. If you are fixing a bug, please add a test that fails
without your code changes.
