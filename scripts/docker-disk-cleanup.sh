#!/usr/bin/env bash
# Reclaim disposable Docker disk after a successful container swap.
# Never removes volumes, databases, or images still used by a container.
disk_pct() {
  df --output=pcent / | tail -1 | tr -dc '0-9'
}

sendfable_docker_cleanup() {
  local before after freed
  before="$(disk_pct)"
  echo "DISK_BEFORE=${before}%"
  echo "CLEANUP_PERFORMED=builder_prune unused_images stopped_containers"
  docker builder prune -af || true
  docker image prune -af || true
  docker container prune -f || true
  after="$(disk_pct)"
  freed=$((before - after))
  echo "DISK_AFTER=${after}%"
  echo "DISK_FREED_POINTS=${freed}"
  df -h / | awk 'NR==2 { print "DISK_USED="$3, "DISK_AVAIL="$4, "DISK_USEPCT="$5 }'
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  sendfable_docker_cleanup
fi
