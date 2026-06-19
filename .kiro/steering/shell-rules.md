# Shell Rules

- Never use `execute_pwsh` or any PowerShell tool/command. This is a WSL2 Ubuntu Linux environment.
- Only use WSL Ubuntu Linux commands. Use `control_pwsh_process` with bash/Linux commands as the execution mechanism when shell access is needed.
