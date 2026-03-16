#!/bin/bash

echo "============================================"
echo "SwarmUI React Interface - Integration Tool"
echo "============================================"
echo ""

# Get the current directory (where the React interface is)
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Current location (source):"
echo "$SOURCE_DIR"
echo ""

# Prompt for SwarmUI directory
echo "Please enter the full path to your main SwarmUI directory"
echo "Example: /home/user/SwarmUI or /opt/SwarmUI"
echo ""
read -p "SwarmUI Directory: " SWARMUI_DIR

if [ -z "$SWARMUI_DIR" ]; then
    echo "ERROR: No directory specified"
    exit 1
fi

# Expand tilde to home directory
SWARMUI_DIR="${SWARMUI_DIR/#\~/$HOME}"

# Check if directory exists
if [ ! -d "$SWARMUI_DIR" ]; then
    echo "ERROR: Directory does not exist: $SWARMUI_DIR"
    echo "Please check the path and try again."
    exit 1
fi

# Check if SwarmUI executable exists
if [ ! -f "$SWARMUI_DIR/launch-linux.sh" ]; then
    echo "WARNING: launch-linux.sh not found in $SWARMUI_DIR"
    echo "This might not be a valid SwarmUI directory."
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

TARGET_DIR="$SWARMUI_DIR/swarmui-react"

echo ""
echo "Summary:"
echo "========"
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

# Check if target already exists
if [ -d "$TARGET_DIR" ]; then
    echo "WARNING: Target directory already exists!"
    echo "This will overwrite existing files."
    echo ""
    read -p "Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
    rm -rf "$TARGET_DIR"
fi

echo ""
echo "[1/3] Copying React interface files..."

# Copy files excluding build artifacts and dependencies
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='release' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.vite' \
    --exclude='*.log' \
    "$SOURCE_DIR/" "$TARGET_DIR/"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to copy files"
    exit 1
fi
echo "Done!"

echo ""
echo "[2/3] Creating launch shortcuts in SwarmUI directory..."

# Create a launcher in the main SwarmUI directory
cat > "$SWARMUI_DIR/start-react-ui.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/swarmui-react"
echo "Starting SwarmUI React Interface..."
npm run dev
EOF

chmod +x "$SWARMUI_DIR/start-react-ui.sh"

echo "Created: $SWARMUI_DIR/start-react-ui.sh"
echo "Done!"

echo ""
echo "[3/3] Integration complete!"
echo ""
echo "============================================"
echo "NEXT STEPS:"
echo "============================================"
echo ""
echo "1. Install dependencies:"
echo "   cd \"$TARGET_DIR\""
echo "   npm install"
echo ""
echo "2. Run the React interface:"
echo "   - Browser mode:   npm run dev"
echo "   - Desktop app:    npm run dev"
echo ""
echo "3. Or use the shortcut from your SwarmUI directory:"
echo "   \"$SWARMUI_DIR/start-react-ui.sh\""
echo ""
echo "See INTEGRATION_GUIDE.md for complete documentation."
echo ""

read -p "Install dependencies now? (y/n): " INSTALL_DEPS
if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
    echo ""
    echo "Installing dependencies..."
    cd "$TARGET_DIR"
    npm install

    if [ $? -eq 0 ]; then
        echo ""
        echo "SUCCESS! Dependencies installed."
        echo ""
        read -p "Start the React interface now? (y/n): " START_NOW
        if [ "$START_NOW" = "y" ] || [ "$START_NOW" = "Y" ]; then
            echo ""
            echo "Starting Electron desktop app..."
            npm run dev
        fi
    else
        echo ""
        echo "ERROR: Failed to install dependencies."
        echo "Try running 'npm install' manually in:"
        echo "$TARGET_DIR"
    fi
fi

echo ""
echo "Integration complete!"
