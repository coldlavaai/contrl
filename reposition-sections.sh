#!/bin/bash
# Script to reposition ChartValuesDisplay and segment statistics
# Move them to appear after Main Chart but before MR Chart

cd /home/moltbot/contrl

# Create backup
cp components/SpcChart.tsx components/SpcChart.tsx.backup

# Use Python to do the restructuring
python3 << 'PYTHON_SCRIPT'
with open("components/SpcChart.tsx", "r") as f:
    content = f.read()

# Find and extract the sections to move
# 1. ChartValuesDisplay section (starts around line 1367)
chart_values_start = content.find("      {/* ── Chart Values Display ── */}")
chart_values_end = content.find("      {/* ── Color Picker Modal ── */}")
chart_values_section = content[chart_values_start:chart_values_end]

# 2. Segment statistics section (starts around line 1438)
segment_stats_start = content.find("      {/* ── Segment statistics cards ── */}")
segment_stats_end = content.find("    </div>\n  );\n}")  # End of component
# Find just the segment section, not the whole rest of the file
# Look for the closing </div> that ends the segment section
temp_content = content[segment_stats_start:]
# Count divs to find matching close
open_count = 0
for i, char in enumerate(temp_content):
    if temp_content[i:i+4] == "<div":
        open_count += 1
    elif temp_content[i:i+6] == "</div>":
        open_count -= 1
        if open_count == 0:
            segment_stats_end = segment_stats_start + i + 6
            break

segment_stats_section = content[segment_stats_start:segment_stats_end]

# Remove these sections from their current location
content_without_moved_sections = (
    content[:chart_values_start] +
    content[chart_values_end:segment_stats_start] +
    content[segment_stats_end:]
)

# Find where to insert: after Main Chart, before MR Chart
# Look for the closing </div> of Main Chart, then insert before MR Chart comment
insert_point = content_without_moved_sections.find("          {/* Moving Range Chart */}")

# Insert the sections at the new location
new_content = (
    content_without_moved_sections[:insert_point] +
    "\n" + chart_values_section.strip() + "\n\n" +
    segment_stats_section.strip() + "\n\n          " +
    content_without_moved_sections[insert_point:]
)

with open("components/SpcChart.tsx", "w") as f:
    f.write(new_content)

print("✅ Repositioned ChartValuesDisplay and segment statistics sections")
PYTHON_SCRIPT

echo "Done! Check the changes with: git diff components/SpcChart.tsx"
