# Daily Git

---

## Installation
```bash
npm install -g daily-git
```

## Save github credentials to npm config

```bash
npm config set dailygitUsername <YOUR GITHUB USERNAME>
npm config set dailygitPassword <YOUR GITHUB PASSWORD>
```

## Get your daily

```bash
# default is 1 day
daily-git

# want to have last 10 days?
daily-git --days 10
```