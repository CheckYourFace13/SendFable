#!/bin/bash
set -u
grep -n 'sendfable\|restore-sf\|enqueueAutopilot\|newsletter' /home/deploy/thedrinkplace/scripts/tdp-national-autopilot.cjs || echo TDP_TIMER_UNRELATED
