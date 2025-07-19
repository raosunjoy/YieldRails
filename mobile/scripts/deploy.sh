#!/bin/bash

# YieldRails Mobile Deployment Script
# This script handles deploying the mobile application to various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
PLATFORM="all"
SKIP_BUILD=false
SKIP_TESTS=false
AUTO_SUBMIT=false
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV       Deploy environment (staging|production) [default: staging]"
    echo "  -p, --platform PLATFORM    Target platform (ios|android|all) [default: all]"
    echo "  -s, --skip-build           Skip the build process"
    echo "  -t, --skip-tests           Skip running tests"
    echo "  -a, --auto-submit          Automatically submit to app stores (production only)"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging -p android"
    echo "  $0 -e production -a"
    echo "  $0 --skip-build --skip-tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -a|--auto-submit)
            AUTO_SUBMIT=true
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be staging or production."
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(ios|android|all)$ ]]; then
    print_error "Invalid platform: $PLATFORM. Must be ios, android, or all."
    exit 1
fi

# Check if we're in the mobile directory
if [[ ! -f "package.json" ]] || [[ ! -f "app.config.js" ]]; then
    print_error "This script must be run from the mobile project root directory."
    exit 1
fi

# Check if required tools are installed
check_dependencies() {
    print_step "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not available. Please update npm."
        exit 1
    fi
    
    # Check for Expo CLI
    if ! npm list -g @expo/cli &> /dev/null; then
        print_warning "Expo CLI not found globally. Installing..."
        npm install -g @expo/cli
    fi
    
    # Check for EAS CLI
    if ! npm list -g eas-cli &> /dev/null; then
        print_warning "EAS CLI not found globally. Installing..."
        npm install -g eas-cli
    fi
    
    print_status "Dependencies check completed."
}

# Check git status
check_git_status() {
    print_step "Checking git status..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository. Deployment requires git."
        exit 1
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "You have uncommitted changes. Consider committing them before deployment."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Get current branch and commit
    CURRENT_BRANCH=$(git branch --show-current)
    CURRENT_COMMIT=$(git rev-parse HEAD)
    
    print_status "Current branch: $CURRENT_BRANCH"
    print_status "Current commit: ${CURRENT_COMMIT:0:8}"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests as requested."
        return
    fi
    
    print_step "Running tests..."
    
    # Install dependencies first
    npm ci
    
    # Run linting
    print_status "Running linter..."
    npm run lint
    
    # Run type checking
    print_status "Running type check..."
    npm run type-check
    
    # Run unit tests
    print_status "Running unit tests..."
    npm run test:unit -- --watchAll=false --coverage
    
    print_status "All tests passed!"
}

# Build application
build_app() {
    if [[ "$SKIP_BUILD" == true ]]; then
        print_warning "Skipping build as requested."
        return
    fi
    
    print_step "Building application..."
    
    # Set environment variables
    export APP_VARIANT="$ENVIRONMENT"
    export NODE_ENV="production"
    
    # Build using EAS
    case $PLATFORM in
        android)
            npx eas build --platform android --profile $ENVIRONMENT --non-interactive
            ;;
        ios)
            npx eas build --platform ios --profile $ENVIRONMENT --non-interactive
            ;;
        all)
            npx eas build --platform all --profile $ENVIRONMENT --non-interactive
            ;;
    esac
    
    print_status "Build completed successfully!"
}

# Deploy to staging
deploy_staging() {
    print_step "Deploying to staging environment..."
    
    # Update Expo channel
    npx expo publish --release-channel staging
    
    print_status "Staging deployment completed!"
    print_status "Staging URL: https://exp.host/@yieldrails/yieldrails-mobile?release-channel=staging"
}

# Deploy to production
deploy_production() {
    print_step "Deploying to production environment..."
    
    # Confirm production deployment
    print_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Production deployment cancelled."
        exit 0
    fi
    
    # Update production release channel
    npx expo publish --release-channel production
    
    # Submit to app stores if requested
    if [[ "$AUTO_SUBMIT" == true ]]; then
        print_step "Submitting to app stores..."
        
        case $PLATFORM in
            android)
                npx eas submit --platform android --profile production --non-interactive
                ;;
            ios)
                npx eas submit --platform ios --profile production --non-interactive
                ;;
            all)
                npx eas submit --platform all --profile production --non-interactive
                ;;
        esac
        
        print_status "App store submission completed!"
    else
        print_warning "Automatic app store submission skipped."
        print_status "To submit manually, run: npx eas submit --platform $PLATFORM --profile production"
    fi
    
    print_status "Production deployment completed!"
}

# Create deployment record
create_deployment_record() {
    print_step "Creating deployment record..."
    
    DEPLOYMENT_FILE="deployments/deployment-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p deployments
    
    cat > "$DEPLOYMENT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "platform": "$PLATFORM",
  "branch": "$CURRENT_BRANCH",
  "commit": "$CURRENT_COMMIT",
  "version": "$(node -p "require('./package.json').version")",
  "deployer": "$(git config user.name || echo 'Unknown')",
  "deployerEmail": "$(git config user.email || echo 'Unknown')",
  "buildSkipped": $SKIP_BUILD,
  "testsSkipped": $SKIP_TESTS,
  "autoSubmit": $AUTO_SUBMIT
}
EOF
    
    print_status "Deployment record created: $DEPLOYMENT_FILE"
}

# Send notifications
send_notifications() {
    print_step "Sending deployment notifications..."
    
    # This would integrate with your notification system
    # For example, Slack, Discord, email, etc.
    
    local message="🚀 YieldRails Mobile deployed to $ENVIRONMENT"
    message="$message\n📱 Platform: $PLATFORM"
    message="$message\n🌿 Branch: $CURRENT_BRANCH"
    message="$message\n📝 Commit: ${CURRENT_COMMIT:0:8}"
    message="$message\n👤 Deployer: $(git config user.name || echo 'Unknown')"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"$message\"}" \
             "$SLACK_WEBHOOK_URL" || true
    fi
    
    print_status "Notifications sent."
}

# Main deployment function
main() {
    print_status "Starting YieldRails Mobile deployment process..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Platform: $PLATFORM"
    
    # Set verbose mode
    if [[ "$VERBOSE" == true ]]; then
        set -x
    fi
    
    # Pre-deployment checks
    check_dependencies
    check_git_status
    
    # Run tests
    run_tests
    
    # Build application
    build_app
    
    # Deploy based on environment
    case $ENVIRONMENT in
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
    esac
    
    # Post-deployment tasks
    create_deployment_record
    send_notifications
    
    print_status "Deployment process completed successfully! 🎉"
    
    # Show next steps
    echo ""
    print_step "Next steps:"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo "  1. Test the staging build thoroughly"
        echo "  2. When ready, deploy to production with: $0 -e production"
    else
        echo "  1. Monitor the production release"
        echo "  2. Check app store review status"
        echo "  3. Prepare release notes for users"
    fi
}

# Trap errors and cleanup
trap 'print_error "Deployment failed! Check the output above for details."' ERR

# Run main function
main "$@"