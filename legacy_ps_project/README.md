[![pipeline status](https://gitlab.com/goteborgsregionen/textaventyr/badges/master/pipeline.svg)](https://gitlab.com/goteborgsregionen/textaventyr/commits/master)
[![coverage report](https://gitlab.com/goteborgsregionen/textaventyr/badges/master/coverage.svg)](https://gitlab.com/goteborgsregionen/textaventyr/commits/master)

# Textäventyr
This project is powered by  **Go 1.x** and uses **npm** to manage all dependencies. The project has a subtheme that is based on **Bootstrap Framework**.

* [x] Go 1.x
* [x] Node Package Manager (npm)
* [x] Bootstrap
* [x] CSS

> For Frequently Asked Questions, please [click here](#faq).

## Environment
The local development environment is best suited to run in Docker, but you also have the option to run the CLI web server without Docker installed.

> If you don't have Docker installed, please [click here][11].

### Requirements
Most of the development tools are in the Docker containers, but you will need one or more out side of that.

This includes:

* [Go 1.x+][1]
* [MariaDB][9] or [MySQL][10]
* [Git][5]
* [Node Package Manager][7]
* [Make][4] (Needed for Windows)


> If you don't have these installed, please install them for your specific platform.

<br>

#### ⬇ Docker *(Recommended)*
___

Run the environment with Docker. Docker will create a multi-container and setup everything automatically.

> | Container name | Containing | Hostname | Ports |
> | -------------- |:----------|:----------:|:----------:|
> | textaventyr_app | Linux (Alpine), Go, Npm, Entr | app | 80:8080 |
> | textaventyr_db | MariaDB | db| 3306:3306 |

##### Run

Start application with docker containers:
```bash
$ make start
```
> Access the site via [http://localhost:8080][0].

##### Stop

Stop application:
```bash
$ make stop
```

<br>

#### ⬇ CLI Web Server
___
Run the environment with CLI. This may not handle all configurations and could require manual actions.

##### Run
Start application:
```bash
$ make serve:start
```

##### Stop
Stop application:
```bash
$ make serve:stop
```

> Access the site via [http://localhost:8081][-1].

> Tip: set `DEV_AUTH_BYPASS=true` in your environment to bypass JWT locally when you only need quick editor/player testing.

<br>

#### ⬇ Database
The database must be up and running for the application to work. You can either start a docker container directly or use a current installed database on your computer.
___

##### Export
Export database sql-dump from available environments:
```bash
$ make db:export
```
> Your `public key` must be included in **/home/goteborgsregionen/.ssh/authorized_keys** (Production) for this to work!

##### Import
Import database sql-dump to your local development environment:
```bash
$ make db:import
```

#### Migrate and seed
Migrate and seed database on your local development environment:
```bash
$ make db:update
```

##### Run

Start database with Docker:
```bash
$ make db:serve
```

<br>

#### ⬇ Testing
Run application tests.
___

##### Go

Run all tests:
```bash
$ make go:test
```

<br>

#### ⬇ Dependency Management
Manage decependencies with npm.

##### Update
Update dependencies:
```bash
$ make npm:update
```

##### Install
Install dependencies:
```bash
$ make npm:install
```

<br>

#### ⬇ Troubleshooting
Run troubleshooting.

##### Makefile
Debug Makefile variables:
```bash
$ make make:debug
```

##### Doctor
Check for missing software:
```bash
$ make doctor
```

##### Logs
Show or attach to server logs:
```bash
$ make logs
```

<br>

## FAQ (Frequently Asked Questions) <a name="faq"></a>

<details>
<summary>How do I install, remove and update dependencies?</summary>
The application is using npm for handling dependencies. All available dependencies can be found in the <b>package.json</b> file.
</details>

<details>
<summary>I have modified package.json, but no changes has occurred?</summary>
Make sure you run <b>make</b> or <b>make npm:update</b> command to apply changes.
</details>

<details>
<summary>Where are the credentials for the production database located?</summary>
There is a service unit installed on the production server called <b>textaventyr.service</b> located in <b>/etc/systemd/system</b>.
</details>

<details>
<summary>Is it possible to connect to MySQL outside docker?</summary>
Yes. You can use SQLyog, MySQL Workbench, Sequal Pro or any client you desire to connect. The credentials can be found in the <b>.env</b> file.
</details>


[-1]: http://localhost:8081
[0]: http://localhost:8080
[1]: https://www.golang.org
[2]: https://www.docker.com/docker-mac
[3]: https://www.docker.com/docker-windows
[4]: http://gnuwin32.sourceforge.net/packages/make.htm
[5]: https://git-scm.com/downloads
[6]: https://brew.sh
[7]: https://www.npmjs.com/get-npm
[8]: https://www.drush.org
[9]: https://mariadb.org
[10]: https://www.mysql.com
[11]: https://docs.docker.com/install
