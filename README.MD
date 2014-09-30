# Daily Git
Prints an overview of all commits since last work day (0 am).

## Installation
```bash
npm install -g daily-git
```

## Create new github token
https://github.com/settings/tokens/new (use default settings)

## Save github credentials using npm config

```bash
npm config set daily-git:token <TOKEN>
npm config set daily-git:username <USERNAME>
```

## Get your daily

```bash
# default is 1 day
daily-git

# want to have last 10 days?
daily-git --days 10
```
