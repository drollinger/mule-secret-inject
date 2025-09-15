# @usu/mule-secret-inject

CLI for integrating MuleSoft projects with Infisical: inject, build, clean

## Prerequisites

- Infisical CLI installed locally (`infisical --version`).
- You’re logged in to Infisical (`infisical login`).
- Project root has .infisical.json (`infisical init`).
- **Recommended**: Apache Maven installed (`mvn -v`).

## Quickstart

```sh
deno run -A jsr:@usu/mule-secret-inject
```

> `-A` (allow-all) is **optional**. Omit it to **manually** approve permissions

## Recommended alias

Add this to your shell config:

**bash** (`~/.bashrc`) or **zsh** (`~/.zshrc`):

```sh
alias msi='deno run -A jsr:@usu/mule-secret-inject'
```

## Usage

### Command Options

```txt
Usage:   @usu/mule-secret-inject
Version: x.x.x                  

Description:

  CLI tool for integrating Mulesoft with Infisical

Options:

  -h, --help                        - Show this help.                            
  -V, --version                     - Show the version number for this program.  
  -e, --environment  <environment>  - Infisical environment                      
  -a, --all-env                     - Inject all environments                    
  -p, --project      <id>           - Infisical project id                       

Commands:

  inject  - Inject secrets setup into project   
  build   - Build jar export for Anypoint       
  clean   - Remove all files relating to secrets
```

### Inject

```txt
Usage:   @usu/mule-secret-inject inject
Version: x.x.x                         

Description:

  Inject secrets setup into project

Options:

  -h, --help                        - Show this help.          
  -e, --environment  <environment>  - Infisical environment    
  -a, --all-env                     - Inject all environments  
  -p, --project      <id>           - Infisical project id     
  -g, --git-ignore                  - Include .gitignore
```

### Build

```txt
Usage:   @usu/mule-secret-inject build
Version: x.x.x                        

Description:

  Build jar export for Anypoint

Options:

  -h, --help                        - Show this help.                           
  -e, --environment  <environment>  - Infisical environment                     
  -a, --all-env                     - Inject all environments                   
  -p, --project      <id>           - Infisical project id                      
  -m, --manual                      - Waits for Anypoint export                 
                                      * Use if you don't have mvn installed     
  -o, --output       <filename>     - Name of output file                       
                                      * Use {e} to add the environment          
                                      * Default: parentFolder-{e}.jar           
                                      * End with '/' to specify only directory
```

## Examples

### Inject secrets

```sh
# Specify the environment and add gitignore
msi inject -e uat -g
# Inject all environments
msi inject -a
```

### Build JAR (default naming)

Default Output: `target/<parentFolder>-{environment}.jar`

```sh
msi build
# Customize name and use {e} to specify environment:
msi build -e uat -o my-first-build-{e}.jar
msi build -e sit -o {e}/sit.jar
# Use a / at the end to specify only the directory (will keep default name):
msi build -a -o all-output/
# Run with the manual tag to manage secrets but then build in Anypoint instead of automatically with mvn
msi build -m
```

### Remove all generated secrets files

```sh
msi clean
```
