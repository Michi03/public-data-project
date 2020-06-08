#!/bin/bash
# TODO -f support for multiple files
function printHelp() {
    echo "Commands:"
    echo "  -h                prints this message"
    echo "  -r REPOSITORY     set the repository where the data is stored"
    echo "  -t ACCESS_TOKEN   set the git access token used"
    echo "  -m MESSAGE        provide a commit message"
    echo "  -f FILENAME       set the path to the file that should be committed"
}

function error() {
    echo "Error: $1"
    exit 1
}

function add() {
    if [ -z $files ]; then
        error "No files to add provided"
    fi
    git add $file
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
}

while getopts "r:t:m:f:h" o; do
    case "${o}" in
        r)
            repoUrl=${OPTARG}
            repoUrl=$(echo $repoUrl | sed 's,http[s]*://,,')
            ;;
        t)
            accessToken=${OPTARG}
            ;;
        m)
            commitMsg=${OPTARG}
            ;;
        f)
            files=${OPTARG}
            ;;
        h)
            printHelp
            exit 0
            ;;
    esac
done

if [ $# -lt 1 ]; then
    printHelp
    exit 1
fi
add
push
exit 0
