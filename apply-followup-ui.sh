#!/bin/bash

# Script to automatically apply follow-up UI changes to scenarios page
# Run this from the project root: bash apply-followup-ui.sh

echo "🚀 Applying Follow-up UI changes to scenarios page..."
echo ""

SCENARIOS_PAGE="src/app/(dashboard)/scenarios/page.js"

# Check if backup exists
if [ ! -f "$SCENARIOS_PAGE.backup" ]; then
  echo "❌ Backup file not found!"
  echo "Please run: cp $SCENARIOS_PAGE $SCENARIOS_PAGE.backup"
  exit 1
fi

# Restore from backup first
cp "$SCENARIOS_PAGE.backup" "$SCENARIOS_PAGE"
echo "✅ Restored from backup"

# Now apply all changes using sed

# 1. Add imports after line 5
sed -i.tmp '5a\
import FollowupSettings from '"'"'@/components/scenarios/FollowupSettings'"'"'\
import FollowupStagesModal from '"'"'@/components/scenarios/FollowupStagesModal'"'"'\
import AnalyticsModal from '"'"'@/components/scenarios/AnalyticsModal'"'"'
' "$SCENARIOS_PAGE"

echo "✅ Added imports"

# 2. Add state variables after selectedScenarioExecutions
sed -i.tmp '/selectedScenarioExecutions.*= useState/a\
\  const [showFollowupStagesModal, setShowFollowupStagesModal] = useState(false)\
\  const [selectedScenarioForFollowup, setSelectedScenarioForFollowup] = useState(null)\
\  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)\
\  const [selectedScenarioForAnalytics, setSelectedScenarioForAnalytics] = useState(null)
' "$SCENARIOS_PAGE"

echo "✅ Added state variables"

# Clean up temp files
rm -f "$SCENARIOS_PAGE.tmp"

echo ""
echo "✨ Done! Changes applied to $SCENARIOS_PAGE"
echo ""
echo "⚠️  Manual steps still required:"
echo "1. Add follow-up fields to formData in CreateScenarioModal (line ~330)"
echo "2. Add <FollowupSettings /> component before Contact Restrictions"
echo "3. Add follow-up fields to EditScenarioModal formData (line ~635)"
echo "4. Add buttons to ScenarioCard"
echo "5. Add modals at the end of ScenariosPage"
echo ""
echo "📖 See UI_INTEGRATION_GUIDE.md for detailed instructions"
