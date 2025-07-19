#!/bin/bash

# YieldRails Mobile Build Script
# This script handles building the mobile application for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PLATFORM="all"
ENVIRONMENT="development"
BUILD_TYPE="apk"
CLEAN=false
VERBOSE=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --platform PLATFORM    Target platform (ios|android|all) [default: all]"
    echo "  -e, --environment ENV       Build environment (development|staging|production) [default: development]"
    echo "  -t, --type TYPE            Build type (apk|aab|ipa) [default: apk]"
    echo "  -c, --clean                Clean build cache before building"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -p android -e staging"
    echo "  $0 -p ios -e production -t ipa"
    echo "  $0 --clean --verbose"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate platform
if [[ ! "$PLATFORM" =~ ^(ios|android|all)$ ]]; then
    print_error "Invalid platform: $PLATFORM. Must be ios, android, or all."
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be development, staging, or production."
    exit 1
fi

# Validate build type
if [[ ! "$BUILD_TYPE" =~ ^(apk|aab|ipa)$ ]]; then
    print_error "Invalid build type: $BUILD_TYPE. Must be apk, aab, or ipa."
    exit 1
fi

# Check if we're in the mobile directory
if [[ ! -f "package.json" ]] || [[ ! -f "app.config.js" ]]; then
    print_error "This script must be run from the mobile project root directory."
    exit 1
fi

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
        if [[ "$OSTYPE" != "darwin"* ]]; then
            print_warning "iOS builds require macOS. Skipping iOS build."
            PLATFORM="android"
        elif ! command -v xcodebuild &> /dev/null; then
            print_error "Xcode is not installed. Please install Xcode to build for iOS."
            exit 1
        fi
    fi
    
    if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
        if [[ ! -d "$ANDROID_HOME" ]]; then
            print_warning "ANDROID_HOME is not set. Please configure Android SDK."
        fi
    fi
}

# Clean build cache
clean_cache() {
    if [[ "$CLEAN" == true ]]; then
        print_status "Cleaning build cache..."
        
        # Clean npm cache
        npm cache clean --force
        
        # Clean Metro bundler cache
        npx react-native start --reset-cache &
        sleep 5
        pkill -f "react-native start" || true
        
        # Clean Gradle cache (Android)
        if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
            if [[ -d "android" ]]; then
                cd android
                ./gradlew clean
                cd ..
            fi
        fi
        
        # Clean iOS build cache
        if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
            if [[ -d "ios" ]]; then
                cd ios
                xcodebuild clean -workspace YieldRailsMobile.xcworkspace -scheme YieldRailsMobile || true
                rm -rf build/
                cd ..
            fi
        fi
        
        print_status "Cache cleaned successfully."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    
    if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
        if [[ -d "ios" ]]; then
            print_status "Installing iOS dependencies..."
            cd ios
            pod install
            cd ..
        fi
    fi
}

# Set environment variables
set_environment() {
    print_status "Setting up environment for $ENVIRONMENT..."
    export APP_VARIANT="$ENVIRONMENT"
    
    case $ENVIRONMENT in
        development)
            export NODE_ENV="development"
            ;;
        staging)
            export NODE_ENV="production"
            ;;
        production)
            export NODE_ENV="production"
            ;;
    esac
}

# Build for Android
build_android() {
    print_status "Building for Android ($BUILD_TYPE)..."
    
    cd android
    
    case $BUILD_TYPE in
        apk)
            ./gradlew assembleRelease
            print_status "Android APK built successfully!"
            print_status "Location: android/app/build/outputs/apk/release/app-release.apk"
            ;;
        aab)
            ./gradlew bundleRelease
            print_status "Android AAB built successfully!"
            print_status "Location: android/app/build/outputs/bundle/release/app-release.aab"
            ;;
    esac
    
    cd ..
}

# Build for iOS
build_ios() {
    print_status "Building for iOS..."
    
    cd ios
    
    xcodebuild -workspace YieldRailsMobile.xcworkspace \
               -scheme YieldRailsMobile \
               -configuration Release \
               -destination 'generic/platform=iOS' \
               -archivePath YieldRailsMobile.xcarchive \
               archive
    
    print_status "iOS archive created successfully!"
    print_status "Location: ios/YieldRailsMobile.xcarchive"
    
    cd ..
}

# Main build function
main() {
    print_status "Starting YieldRails Mobile build process..."
    print_status "Platform: $PLATFORM"
    print_status "Environment: $ENVIRONMENT"
    print_status "Build Type: $BUILD_TYPE"
    
    # Set verbose mode
    if [[ "$VERBOSE" == true ]]; then
        set -x
    fi
    
    # Check dependencies
    check_dependencies
    
    # Clean cache if requested
    clean_cache
    
    # Install dependencies
    install_dependencies
    
    # Set environment variables
    set_environment
    
    # Pre-build steps
    print_status "Running pre-build checks..."
    npm run lint
    npm run type-check
    
    # Build for specified platforms
    case $PLATFORM in
        android)
            build_android
            ;;
        ios)
            build_ios
            ;;
        all)
            build_android
            build_ios
            ;;
    esac
    
    print_status "Build process completed successfully! 🎉"
}

# Trap errors and cleanup
trap 'print_error "Build failed! Check the output above for details."' ERR

# Run main function
main "$@"