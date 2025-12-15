MAJOR_VERSION=1
MINOR_VERSION=0
PATCH_VERSION=5

ENV_LOCAL_FILE=.env.local
ENV_DOCKER_FILE=.env
ENV_LOCAL_DEV_FILE=.env.development.local

include $(ENV_LOCAL_FILE) $(ENV_DOCKER_FILE) $(ENV_LOCAL_DEV_FILE)

SHELL := /bin/bash # Use bash syntax
ENV_LOCAL_ALL=$(shell cat $(ENV_LOCAL_FILE) | while read -r line ; do echo "-e $$line"; done)
LOCAL_APPSERVER_PORT=$(shell (source $(ENV_LOCAL_FILE) && echo $$SERVER_PORT))
LOCAL_DBSERVER_PORT=$(shell (source $(ENV_LOCAL_FILE) && echo $$DB_PORT))
CURRENT_RUNNER=$(shell (ls /.dockerenv >> /dev/null 2>&1 && echo GoDocker) || echo Go)
CURRENT_DBSERVER=$(shell (nc -dvzw1 localhost $(LOCAL_DBSERVER_PORT) &> /dev/null && echo true || echo false))
CURRENT_IS_DBSERVER_DOCKER=$(shell docker ps -q -f name=$(DOCKER_DB_CONTAINER_NAME) 2> /dev/null | grep -q '^' && echo true || echo false)
CURRENT_EXISTS_DBSERVER_DOCKER=$(shell docker ps | grep "$(DOCKER_DB_CONTAINER_NAME)" &> /dev/null && echo true || echo false)
CURRENT_IS_APPSERVER_DOCKER=$(shell docker ps -q -f name=$(DOCKER_APP_CONTAINER_NAME) 2> /dev/null | grep -q '^' && echo true || echo false)
CURRENT_IS_APPSERVER_LOCAL=$(shell (nc -dvzw1 localhost $(LOCAL_APPSERVER_PORT) &> /dev/null && echo true || echo false))
CURRENT_DATE=$(shell date +%F_%T)

default: install
	@docker-compose build

install: npm%install

update: npm%update

start: npm%install watch%start default up

restart: stop up

stop: go%kill watch%kill
	@docker-compose stop

up:
	@docker-compose up -d

logs:
	@docker-compose logs -f

build: go%build

run: go%run

serve:
	@make serve:start

serve%start:
	@make go:serve

serve%stop: watch%stop
	@make go:kill

reload:
	@if [ $(RELOAD_IS_DOCKER) = true ] ; then \
		docker exec -i $(DOCKER_DB_CONTAINER_NAME) make build; \
		type osascript &>/dev/null && osascript -e 'tell application "Google Chrome" to reload (tabs of window 1 whose URL contains "localhost:$(LOCAL_APPSERVER_PORT)")' & \
		docker exec -i $(DOCKER_DB_CONTAINER_NAME) make run; \
	else \
		make build; \
		type osascript &>/dev/null && osascript -e 'tell application "Google Chrome" to reload (tabs of window 1 whose URL contains "localhost:8081")' & \
		make run; \
	fi

go%test:
	@go test -v

go%build: go%kill
	@echo -e "\033[3;33mBuilding application ...\033[0m"
	@go build -o $(APP_BINARY_NAME) -buildvcs=false -ldflags "-X main.serverrunner=$(CURRENT_RUNNER) -X main.environment= -X main.buildnumber=`date -u +%Y%m%d.%H%M%S` -X main.buildgreeter=none -X main.buildtrigger=none" $(APP_BINARY_ENTRYPOINT)

go%run:
	@echo -e "\033[3;33mRunning application ...\033[0m"
	@./$(APP_BINARY_NAME)

go%kill:
	@pkill $(APP_BINARY_NAME) 2> /dev/null && echo -e "\033[3;31mTerminating application ...\033[0m" || true

go%serve: go%build watch%start
	@if [ $(CURRENT_DBSERVER) ]; then echo -e "\033[1;33m[WARNING]\033[0m MySQL/MariaDB already running on port $(DB_PORT)."; else make db:serve; fi
	@make go:run

db%serve:
	@echo -e "\033[3;33mRunning MySQL/MariaDB on port $(DB_PORT) ...\033[0m"
	@if [ $(CURRENT_EXISTS_DBSERVER_DOCKER) = true ] ; then \
		docker start $(DOCKER_DB_CONTAINER_NAME) ; \
	else \
		docker-compose run $(ENV_LOCAL_ALL) -p $(DB_PORT):$(DB_PORT) -d --rm --no-deps --name $(DOCKER_DB_CONTAINER_NAME) db ; \
	fi;

db%build:
	@echo -e "\033[3;33mGenerating sql for migration ...\033[0m"
	@echo -e "/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n/*!40101 SET NAMES utf8*/;\n/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n" > $(APP_DB_DIR)/$(APP_DB_DUMP_FILE)
	@cat $(APP_DB_DIR)/migrations/* $(APP_DB_DIR)/seeds/* >> $(APP_DB_DIR)/$(APP_DB_DUMP_FILE) && echo -e "\033[1;36m[OK]\033[0m sql generated: /$(APP_DB_DIR)/$(APP_DB_DUMP_FILE)" || echo -e "\033[1;31m[ERROR] Could not generate sql\033[0m"; \

db%update: db%build
	@echo -e "\033[3;33mMigrating and seeding database ...\033[0m"
	@if [ $(CURRENT_IS_DBSERVER_DOCKER) ] ; then \
		docker exec -i $(DOCKER_DB_CONTAINER_NAME) mysql -uroot -p$(DOCKER_DB_PASSWORD) $(DB_NAME) < $(APP_DB_DIR)/$(APP_DB_DUMP_FILE) ; \
	else \
		mysql -u$(DB_LOCAL_DBUSER) -p$(DB_LOCAL_DBPASSWORD) $(DB_LOCAL_HOST) < $(APP_DB_DIR)/$(APP_DB_DUMP_FILE) ; \
	fi;

db%export:
	@echo -e "\n*------------* \033[33m EXPORT DATABASE \033[0m *------------*\n\n\033[1;33mEnvironment:\033[0m Production\n\033[1;33mDatabase:\033[0m $(DB_REMOTE_SERVER_DBNAME)\n\033[1;33mServer:\033[0m $(DB_REMOTE_SERVER_HOST)\n"
	@read -p "Where do you want save the sql dump file? Eg. /tmp: " DUMP_PATH ; \
	if ! [ -a $$DUMP_PATH ] || [ -z $$DUMP_PATH ] ; then \
		echo -e "\033[1;31m[ERROR] Path not found\033[0m"; \
	else \
		ssh $(DB_REMOTE_TUNNELSERVER) -p $(DB_REMOTE_TUNNELSERVER_SSHPORT) "mysqldump --single-transaction -h $(DB_REMOTE_SERVER_HOST) -u$(DB_REMOTE_SERVER_DBUSER) -p$(DB_REMOTE_SERVER_DBPASSWORD) $(DB_REMOTE_SERVER_DBNAME)" > $$DUMP_PATH/$(DB_REMOTE_SERVER_DUMP_FILE) ; \
		if [ -a $$DUMP_PATH/$(DB_REMOTE_SERVER_DUMP_FILE) ] ; then \
			echo -e "\033[1;36m[OK]\033[0m sql dump file saved: $$DUMP_PATH/$(DB_REMOTE_SERVER_DUMP_FILE)"; \
		else \
			echo -e "\033[1;31m[ERROR] Unable to save sql dump file\033[0m"; \
		fi; \
	fi;

db%import:
	@$(eval DB_LOCAL_HOST="$(shell source $(ENV_LOCAL_FILE) && echo $$DB_HOST)")
	@$(eval DB_LOCAL_PORT="$(shell source $(ENV_LOCAL_FILE) && echo $$DB_PORT)")
	@$(eval DB_LOCAL_DBUSER="$(shell source $(ENV_LOCAL_FILE) && echo $$DB_USERNAME)")
	@$(eval DB_LOCAL_DBPASSWORD="$(shell source $(ENV_LOCAL_FILE) && echo $$DB_PASSWORD)")
	@echo -e "\n*----------* \033[33m IMPORT DATABASE \033[0m *----------*\n\n\033[1;33mHost:\033[0m $(DB_LOCAL_HOST)\n\033[1;33mPort:\033[0m $(DB_LOCAL_PORT)\n"
	@read -p "Enter location of sql dump file: " DUMP_PATH ; \
	if ! [ -a $$DUMP_PATH ] ; then \
		echo -e "\033[1;31m[ERROR] sql dump file not found in path\033[0m"; \
	else \
		if [ $(CURRENT_IS_DBSERVER_DOCKER) ] ; then \
			docker exec -i $(DOCKER_DB_CONTAINER_NAME) mysql -uroot -p$(DOCKER_DB_PASSWORD) $(DB_NAME) < $$DUMP_PATH ; \
		else \
			mysql -u$(DB_LOCAL_DBUSER) -p$(DB_LOCAL_DBPASSWORD) $(DB_LOCAL_HOST) < $$DUMP_PATH ; \
		fi; \
	fi;

npm%install:
	@npm install

npm%update:
	@npm update

composer%install:
	@composer install

composer%update:
	@composer update

watch%start:
	@if type entr &> /dev/null; then \
		echo -e "\033[3;33mRunning entr in background ...\033[0m" ; \
		while true; do \
			find . -type f -iname '*.go' -o -iname '*.html' | entr -dsrp 'make reload RELOAD_IS_DOCKER=$(CURRENT_IS_APPSERVER_DOCKER)' || break ; \
		done & \
  	else \
	  	echo -e "\033[1;33m[WARNING]\033[0m entr not found."; \
	fi

watch%stop:
	@make watch:kill

watch%kill:
	@pkill entr 2> /dev/null && echo -e "\033[3;31mTerminating watcher ...\033[0m" || true

clean: go%kill stop
	@rm $(APP_BINARY_NAME) &> /dev/null && echo -e "\033[3;31mRemoving build ...\033[0m" || true

destroy: stop
	@echo -en "\033[5;31mAre you sure you want to continue?\033[0m \033[1;36m[y/n]\033[0m: " ; \
	read RESPONSE ; \
	if [[ $$RESPONSE = [yY] ]] ; then \
		docker-compose rm -vf ; \
	fi;

doctor:
	@$(eval OK="$(shell echo -e '\033[0;36m[OK]\033[0m') ")
	@$(eval NOTFOUND="$(shell echo -e '\033[5;31m[Not found]\033[0m') ")
	@$(eval INFO="$(shell echo -e '\033[3;33m- For installation and instructions, Please see: \033[0m')")
	@echo -e "\n*---------------* \033[33m DOCTOR \033[0m *---------------*\n"
	@echo -n "Cat: " && type cat >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Composer: " && type composer >/dev/null 2>&1 && echo -n $(OK) && composer -V --no-ansi || echo -e $(NOTFOUND)$(INFO)https://getcomposer.org/download
	@echo -n "Copy (cp): " && type cp >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Docker: " && type docker >/dev/null 2>&1 && echo -n $(OK) && docker -v || echo -e $(NOTFOUND)$(INFO)https://docs.docker.com/install
	@echo -n "Entr: " && type entr >/dev/null 2>&1 && echo -n $(OK) && entr 2>&1 | head -n 1 || echo -e $(NOTFOUND)$(INFO)https://github.com/clibs/entr
	@echo -n "Find: " && type find >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Git: " && type git >/dev/null 2>&1 && echo -n $(OK) && git --version || echo -e $(NOTFOUND)$(INFO)https://git-scm.com/downloads
	@echo -n "Go: " && type go >/dev/null 2>&1 && echo -n $(OK) && go version || echo -e $(NOTFOUND)$(INFO)https://golang.org/doc/install
	@echo -n "Grep: " && type grep >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Head: " && type head >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Mysql (Client): " && type mysql >/dev/null 2>&1 && echo -n $(OK) && mysql --version || echo $(NOTFOUND)
	@echo -n "Netcat (nc): " && type nc >/dev/null &>/dev/null && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Npm: " && type npm >/dev/null 2>&1 && echo -n $(OK) && npm -v || echo -e $(NOTFOUND)$(INFO)https://www.npmjs.com/get-npm
	@echo -n "Pkill: " && type pkill >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Rsync: " && type rsync >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Sed: " && type sed >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Sleep: " && type sleep >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo -n "Source: " && type source >/dev/null 2>&1 && echo $(OK) || echo $(NOTFOUND)
	@echo ""

make%pull:
	@mkdir -p $(TEMP_DIR) && rm -rf $(TEMP_DIR)/$(MAKEFILE_REPOSITORY_NAME) && git -C $(TEMP_DIR) clone $(MAKEFILE_REPOSITORY_URL) -q
	@cd $(TEMP_DIR)/$(MAKEFILE_REPOSITORY_NAME)/$(MAKEFILE) && head -3 Makefile > .version
	@$(eval VERSION="$(shell source $(TEMP_DIR)/$(MAKEFILE_REPOSITORY_NAME)/$(MAKEFILE)/.version && echo $$MAJOR_VERSION$$MINOR_VERSION$$PATCH_VERSION)")
	@echo -e "\n*----------* \033[33m UPDATE POWERMAKEFILE \033[0m *----------*\n\n\033[1;33mCurrent version:\033[0m $(MAJOR_VERSION).$(MINOR_VERSION).$(PATCH_VERSION)\033[0m"
	@if [[ $(MAJOR_VERSION)$(MINOR_VERSION)$(PATCH_VERSION) < $(VERSION) ]]; then \
		echo -en "\033[1;33mNew available version:\033[0m " && echo $(VERSION) | sed 's/./&./g; s/.$$//'; \
		echo -en "\n\033[5;31mAre you sure you want to continue?\033[0m \033[1;36m[y/n]\033[0m: " ; \
		read RESPONSE ; \
		if [[ $$RESPONSE = [yY] ]] ; then \
			cp $(TEMP_DIR)/$(MAKEFILE_REPOSITORY_NAME)/$(MAKEFILE)/* . ; \
		fi \
	else \
		echo -e "Already up-to-date\n"; \
	fi;

make%install:
	@$(eval MAKEFILE_TARGET="$(filter-out $@,$(MAKECMDGOALS))")
	@if [ -z $(MAKEFILE_TARGET) ] ; then \
		echo -e "\033[1;31m[ERROR] Argument not found\033[0m"; \
	elif ! [ -a ../$(MAKEFILE_TARGET)/Makefile ] ; then \
		echo -e "\033[1;31m[ERROR] Makefile target not found\033[0m"; \
	else \
		echo -e "\n*----------* \033[33m INSTALL MAKEPOWERFILE \033[0m *----------*\n\n\033[1;33mMakefile:\033[0m $(MAKEFILE_TARGET)\n"; \
		read -p "Enter location of your application: " APP_PATH ; \
		if ! [ -a $$APP_PATH ] ; then \
			echo -e "\033[1;31m[ERROR] Path not found\033[0m"; \
		else \
			echo -e "\n\033[1;33mInstallation path:\033[0m $$APP_PATH"; \
			echo -en "\n\033[5;31mAre you sure you want to continue?\033[0m \033[1;36m[y/n]\033[0m: " ; \
			read RESPONSE ; \
			if [[ $$RESPONSE = [yY] ]] ; then \
				cp -v {.,}* $$APP_PATH ; \
				echo -e "\033[7;32;5m [OK] Makepowerfile installed \033[0m\n"; \
			fi \
		fi; \
		echo -e ""; \
	fi; \

make%debug:
	@echo -e "\n*---------------* \033[33m DEBUG \033[0m *---------------*\n"
	@echo -e "Makefile version: \033[1;36m$(MAJOR_VERSION).$(MINOR_VERSION).$(PATCH_VERSION)\033[0m"
	@echo -e "Application binary name: \033[1;36m$(APP_BINARY_NAME)\033[0m"
	@echo -e "Application binary entrypoint: \033[1;36m$(APP_BINARY_ENTRYPOINT)\033[0m"
	@echo -e "Application database migration & seed directory: \033[1;36m/$(APP_DB_DIR)\033[0m"
	@echo -e "Application database generated migration & seed dump name: \033[1;36m$(APP_DB_DUMP_FILE)\033[0m"
	@echo -e "Application database generated export dump name: \033[1;36m$(DB_REMOTE_SERVER_DUMP_FILE)\033[0m"
	@echo -e "Application running Docker on localhost@$(DOCKER_APP_PUBLISHED_PORT): \033[1;36m[$(CURRENT_IS_APPSERVER_DOCKER)]\033[0m"
	@echo -e "Application running CLI on localhost@$(LOCAL_APPSERVER_PORT): \033[1;36m[$(CURRENT_IS_APPSERVER_LOCAL)]\033[0m"
	@echo -e "Database listening on localhost@$(DB_PORT): \033[1;36m[$(CURRENT_DBSERVER)]\033[0m"
	@echo -e "Database using Docker: \033[1;36m[$(CURRENT_IS_DBSERVER_DOCKER)]\033[0m"
	@echo -e "Database Docker exists in localhost: \033[1;36m[$(CURRENT_EXISTS_DBSERVER_DOCKER)]\033[0m"
	@echo -e "Current environment runner: \033[1;36m$(CURRENT_RUNNER)\033[0m"
	@echo -e "Current date: \033[1;36m$(CURRENT_DATE)\033[0m"
	@echo -e "Local environment parameters: \033[1;36m$(ENV_LOCAL_ALL)\033[0m"
	@echo ""