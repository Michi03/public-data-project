#!/bin/bash
argCount=0
function printHelp() {
    echo "Commands:"
    echo "  help                                                         prints this message"
    echo "  post -r REPOSITORY -t ACCESS_TOKEN -m MESSAGE  FILENAME(S)   creates a commit with the given file(s) to the given repository with the given message using the given token"
}

function error() {
    echo "Error: $1"
    exit 1
}

function add() {
    if [ $# -lt 1 ]; then
        error "No file provided to add"
    fi
    git add $fileName
    exit 0
}

function push() {
    if [ -z $repoUrl ]; then
        error "No repository provided"
    fi
    if [ -z $accessToken ]; then
        error "No access token provided"
    fi
    if [ -z $commitMsg ]; then
        commitMsg="No commit message provided"
    fi
    git commit -m "$commitMsg"
    git push -f https://script:$accessToken@$repoUrl
    exit 0
}

while getopts "r:t:m:f" o; do
  	case "${o}" in
    		r)
            argCount=$((argCount + 2))
            repoUrl=${OPTARG}
            repoUrl=$(echo $repoUrl | sed 's,http[s]*://,,')
      			;;
    		t)
            argCount=$((argCount + 2))
      			accessToken=${OPTARG}
      			;;
    		m)
            argCount=$((argCount + 2))
      			commitMsg=${OPTARG}
      			;;
        *)
            echo "Use command help for help"
            ;;
  	esac
done

if [ $# -lt 1 ]; then
    printHelp
    exit 1
fi
if [ $1 == "post" ]; then
    argCount=$((argCount + 1))
    for fileName in "${@:$argCount}"; do
        add $@
    push
fi
if [ $1 == "help" ]; then
    printHelp
    exit 0
else
    error "Unkown command: $1"
fi
