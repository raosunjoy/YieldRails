# YieldRails Troubleshooting Guide

## Table of Contents

1. [General Issues](#general-issues)
2. [Account & Authentication](#account--authentication)
3. [Wallet Connection](#wallet-connection)
4. [Deposits & Withdrawals](#deposits--withdrawals)
5. [Portfolio Management](#portfolio-management)
6. [Performance Issues](#performance-issues)
7. [Mobile App Issues](#mobile-app-issues)
8. [API Issues](#api-issues)
9. [Network & Blockchain](#network--blockchain)
10. [Security Concerns](#security-concerns)
11. [Contact Support](#contact-support)

---

## General Issues

### Cannot Access the Platform

**Problem**: Unable to access yieldrails.com or app loads blank page.

**Solutions**:
1. **Check Internet Connection**
   - Verify your internet connection is stable
   - Try accessing other websites to confirm connectivity

2. **Clear Browser Cache**
   - Clear browser cache and cookies
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Try incognito/private browsing mode

3. **Browser Compatibility**
   - Use supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
   - Disable browser extensions that might interfere
   - Update your browser to the latest version

4. **Network Restrictions**
   - Check if your corporate/school network blocks crypto websites
   - Try using a different network or mobile data
   - Use a VPN if accessing from a restricted region

**Still not working?** Check our [Status Page](https://status.yieldrails.com) for service outages.

### Page Loading Slowly

**Problem**: Platform loads but pages are slow to respond.

**Solutions**:
1. **Check Network Speed**
   - Run a speed test - minimum 5 Mbps recommended
   - Close bandwidth-heavy applications

2. **Browser Optimization**
   - Close unnecessary browser tabs
   - Disable ad blockers for yieldrails.com
   - Clear DNS cache

3. **Server Load**
   - High traffic periods may cause slower response times
   - Try accessing during off-peak hours
   - Check status page for performance issues

---

## Account & Authentication

### Cannot Log In

**Problem**: Login fails with correct credentials.

**Solutions**:
1. **Password Issues**
   - Ensure Caps Lock is off
   - Check for extra spaces in email/password
   - Try copy-pasting credentials to avoid typos
   - Use "Forgot Password" if uncertain

2. **Two-Factor Authentication**
   - Ensure device time is synchronized
   - Try generating a new 2FA code
   - Use backup codes if authenticator app isn't working
   - Check if 2FA app needs time sync

3. **Account Status**
   - Verify email address (check spam folder)
   - Account may be temporarily locked after multiple failed attempts
   - Wait 30 minutes and try again

### Two-Factor Authentication Not Working

**Problem**: 2FA codes are being rejected.

**Solutions**:
1. **Time Synchronization**
   - Ensure your device time is correct
   - In Google Authenticator: Settings > Time correction for codes > Sync now
   - In Authy: Settings > App Settings > Sync

2. **Code Entry**
   - Enter the 6-digit code without spaces
   - Use the most recent code generated
   - Don't use the same code twice

3. **Backup Options**
   - Use backup codes provided during 2FA setup
   - Contact support to disable 2FA temporarily

### Forgot Password

**Problem**: Cannot remember account password.

**Solutions**:
1. **Password Reset**
   - Click "Forgot Password" on login page
   - Enter your registered email address
   - Check email (including spam folder) for reset link
   - Follow instructions in the email

2. **Reset Link Issues**
   - Link expires in 24 hours - request a new one if needed
   - Ensure you're clicking the latest link received
   - Try opening the link in a different browser

3. **Email Not Received**
   - Check spam/junk folders
   - Add support@yieldrails.com to your contacts
   - Try using a different email if you have multiple accounts

---

## Wallet Connection

### MetaMask Not Connecting

**Problem**: MetaMask doesn't connect or connection fails.

**Solutions**:
1. **MetaMask Setup**
   - Ensure MetaMask is installed and unlocked
   - Refresh the page and try connecting again
   - Update MetaMask to the latest version

2. **Network Configuration**
   - Switch to the correct network (Ethereum mainnet by default)
   - Add custom networks if using Polygon, Arbitrum, etc.
   - Check if network RPC is working

3. **Permission Issues**
   - Clear site permissions in MetaMask
   - Go to Settings > Connected Sites and remove yieldrails.com
   - Reconnect and approve all permissions

4. **Browser Issues**
   - Disable other wallet extensions temporarily
   - Try connecting in incognito mode
   - Clear browser cache and cookies

### Hardware Wallet Issues

**Problem**: Ledger/Trezor wallet not connecting or signing.

**Solutions**:
1. **Device Setup**
   - Ensure device is unlocked and Ethereum app is open
   - Update device firmware to latest version
   - Update Ledger Live/Trezor Suite software

2. **Browser Settings**
   - Enable "Experimental Web Platform features" in Chrome
   - Use a compatible browser (Chrome, Brave, Edge)
   - Try connecting via MetaMask with hardware wallet

3. **Connection Issues**
   - Use official USB cable
   - Try different USB ports
   - Disable Windows fast startup
   - Check device drivers are installed

### Wrong Network

**Problem**: Wallet is connected to wrong blockchain network.

**Solutions**:
1. **Network Switching**
   - YieldRails will prompt to switch networks automatically
   - Manually switch in your wallet if needed
   - Add network if not available in wallet

2. **Network Configuration**
   - **Ethereum Mainnet**: Chain ID 1
   - **Polygon**: Chain ID 137, RPC: https://polygon-rpc.com
   - **Arbitrum**: Chain ID 42161, RPC: https://arb1.arbitrum.io/rpc
   - **Optimism**: Chain ID 10, RPC: https://mainnet.optimism.io

---

## Deposits & Withdrawals

### Transaction Stuck or Failed

**Problem**: Deposit/withdrawal transaction is pending or failed.

**Solutions**:
1. **Check Transaction Status**
   - Copy transaction hash from YieldRails
   - Check on blockchain explorer (Etherscan, Polygonscan, etc.)
   - Look for error messages in transaction details

2. **Low Gas Price**
   - Transaction may be stuck due to low gas price
   - Speed up transaction in MetaMask (if available)
   - Cancel and retry with higher gas price

3. **Failed Transactions**
   - Check error message in transaction details
   - Common issues: insufficient gas, slippage too low, contract error
   - Retry with adjusted parameters

### Insufficient Gas

**Problem**: Transaction fails due to insufficient gas.

**Solutions**:
1. **Gas Balance**
   - Ensure you have enough ETH (or native token) for gas
   - Minimum 0.01 ETH recommended for Ethereum transactions
   - Consider gas fees when planning transactions

2. **Gas Settings**
   - Use "Fast" or "Fastest" gas settings during network congestion
   - Manually set gas limit 10-20% higher if transactions fail
   - Check current gas prices on ETH Gas Station

3. **Network Selection**
   - Consider using Layer 2 networks (Polygon, Arbitrum) for lower fees
   - Switch networks in your wallet and try again

### Token Approval Issues

**Problem**: Cannot deposit due to token approval problems.

**Solutions**:
1. **Approval Process**
   - First transaction approves token spending
   - Second transaction executes the deposit
   - Both transactions need to complete successfully

2. **Approval Settings**
   - Approve exact amount or unlimited (your choice)
   - Check if previous approval was for insufficient amount
   - Reset approval to 0 first if increasing amount (for some tokens)

3. **Common Errors**
   - "Transfer amount exceeds allowance" - increase approval
   - "Approval failed" - check gas settings and try again

### Slippage Issues

**Problem**: Transaction fails due to slippage tolerance.

**Solutions**:
1. **Slippage Settings**
   - Default slippage: 0.5% for stablecoins, 1-3% for volatile assets
   - Increase slippage tolerance during high volatility
   - Use automatic slippage for optimal settings

2. **Market Conditions**
   - High volatility periods may require higher slippage
   - Large transactions may need higher slippage tolerance
   - Try smaller amounts during volatile periods

---

## Portfolio Management

### Portfolio Value Not Updating

**Problem**: Portfolio value appears incorrect or outdated.

**Solutions**:
1. **Refresh Data**
   - Use the refresh button in the interface
   - Hard refresh the browser page (Ctrl+F5)
   - Wait a few minutes for on-chain data to update

2. **Blockchain Sync**
   - Portfolio values update with new blocks
   - During network congestion, updates may be delayed
   - Check if transaction is confirmed on blockchain

3. **Cache Issues**
   - Clear browser cache and cookies
   - Try accessing from different device/browser
   - Log out and log back in

### Strategy Performance Discrepancy

**Problem**: Strategy performance differs from expected returns.

**Solutions**:
1. **Performance Calculation**
   - Returns are calculated from time of deposit
   - APY is estimated based on current conditions
   - Past performance doesn't guarantee future returns

2. **Market Factors**
   - DeFi yields fluctuate based on market conditions
   - Protocol changes can affect returns
   - Impermanent loss may affect liquidity provision strategies

3. **Fee Impact**
   - Management fees are deducted from returns
   - Gas fees reduce net returns
   - Check fee structure in strategy details

### Cannot Withdraw Funds

**Problem**: Withdrawal option is disabled or fails.

**Solutions**:
1. **Lock-up Periods**
   - Some strategies have minimum lock-up periods
   - Check strategy details for withdrawal restrictions
   - Wait for lock-up period to end

2. **Liquidity Issues**
   - Protocol may have temporary liquidity constraints
   - Try withdrawing smaller amounts
   - Wait for liquidity to improve

3. **Strategy Status**
   - Strategy may be paused for security reasons
   - Check strategy status and announcements
   - Contact support for emergency withdrawals

---

## Performance Issues

### Slow Loading

**Problem**: Interface is slow or unresponsive.

**Solutions**:
1. **Browser Performance**
   - Close unnecessary tabs and applications
   - Disable heavy browser extensions
   - Try using a different browser

2. **Device Resources**
   - Ensure sufficient RAM available (4GB+ recommended)
   - Close resource-intensive applications
   - Restart browser or device if necessary

3. **Network Optimization**
   - Use wired connection if possible
   - Avoid peak internet usage times
   - Check for background downloads/updates

### Charts Not Loading

**Problem**: Performance charts or graphs don't display.

**Solutions**:
1. **Browser Compatibility**
   - Enable JavaScript in browser settings
   - Disable ad blockers for yieldrails.com
   - Update browser to latest version

2. **Data Sources**
   - Charts require external data feeds
   - Check if external services are accessible
   - Try refreshing after a few minutes

---

## Mobile App Issues

### App Crashes

**Problem**: Mobile app closes unexpectedly.

**Solutions**:
1. **App Updates**
   - Update to latest app version
   - Check app store for pending updates
   - Restart device after updating

2. **Device Resources**
   - Close other apps to free memory
   - Restart device if persistent
   - Ensure sufficient storage space (1GB+ free)

3. **Reinstallation**
   - Delete and reinstall the app
   - Log back in with your credentials
   - Restore from backup if available

### Biometric Login Issues

**Problem**: Face ID or fingerprint authentication not working.

**Solutions**:
1. **Device Settings**
   - Ensure biometrics are enabled in device settings
   - Re-register biometrics if recently changed
   - Check app permissions for biometric access

2. **App Settings**
   - Disable and re-enable biometric login in app
   - Use PIN/password as backup
   - Update app if biometric features are new

### Push Notifications Not Working

**Problem**: Not receiving mobile notifications.

**Solutions**:
1. **Permission Check**
   - Enable notifications in device settings
   - Check app-specific notification permissions
   - Verify notification settings within the app

2. **Notification Settings**
   - Check which notifications are enabled in app
   - Test notifications with a small transaction
   - Check "Do Not Disturb" settings on device

---

## API Issues

### Authentication Errors

**Problem**: API requests return authentication errors.

**Solutions**:
1. **API Key Validation**
   - Verify API key is correct and not expired
   - Check API key permissions match required actions
   - Regenerate API key if compromised

2. **Request Format**
   - Include API key in Authorization header
   - Format: `Authorization: Bearer YOUR_API_KEY`
   - Check for extra spaces or characters

### Rate Limiting

**Problem**: Receiving rate limit errors.

**Solutions**:
1. **Request Frequency**
   - Reduce request frequency to stay within limits
   - Implement exponential backoff for retries
   - Cache responses when possible

2. **Rate Limits**
   - Public endpoints: 100 requests/minute
   - Authenticated endpoints: 1000 requests/minute
   - Monitor rate limit headers in responses

### Response Errors

**Problem**: API returns unexpected error responses.

**Solutions**:
1. **Request Validation**
   - Check request parameters match API documentation
   - Validate data types and required fields
   - Review error message for specific issues

2. **Status Monitoring**
   - Check API status page for service issues
   - Implement retry logic for temporary failures
   - Contact support for persistent errors

---

## Network & Blockchain

### High Gas Fees

**Problem**: Transaction costs are too expensive.

**Solutions**:
1. **Network Selection**
   - Use Layer 2 networks for lower fees (Polygon, Arbitrum, Optimism)
   - Bridge funds to cheaper networks
   - Compare costs across networks

2. **Timing Optimization**
   - Monitor gas prices and transact during low-fee periods
   - Weekends typically have lower gas prices
   - Use gas tracking tools for optimal timing

3. **Transaction Optimization**
   - Batch multiple operations when possible
   - Use limit orders instead of market orders
   - Consider smaller, more frequent transactions

### Network Congestion

**Problem**: Transactions are slow due to network congestion.

**Solutions**:
1. **Gas Price Adjustment**
   - Increase gas price for faster confirmation
   - Use "Fast" or "Fastest" settings in wallet
   - Monitor network congestion levels

2. **Alternative Networks**
   - Switch to less congested networks
   - Use Layer 2 solutions for faster transactions
   - Consider transaction timing

### RPC Errors

**Problem**: RPC endpoint errors or connection issues.

**Solutions**:
1. **RPC Configuration**
   - Try different RPC endpoints for the network
   - Use official RPCs when possible
   - Check RPC status and uptime

2. **Network Switching**
   - Switch networks and switch back
   - Clear network cache in wallet
   - Remove and re-add custom networks

---

## Security Concerns

### Suspicious Activity

**Problem**: Noticing unauthorized transactions or account access.

**Immediate Actions**:
1. **Secure Your Account**
   - Change password immediately
   - Enable 2FA if not already active
   - Review and revoke any suspicious API keys

2. **Wallet Security**
   - Check wallet transaction history
   - Revoke token approvals for unknown contracts
   - Consider moving funds to a new wallet

3. **Contact Support**
   - Report suspicious activity immediately
   - Provide transaction hashes and timestamps
   - Enable additional security monitoring

### Phishing Concerns

**Problem**: Received suspicious emails or messages claiming to be from YieldRails.

**Verification Steps**:
1. **Official Channels**
   - Only trust communications from @yieldrails.com emails
   - Verify URLs - only use yieldrails.com (check for typos)
   - Official social media accounts are verified

2. **Red Flags**
   - Requests for private keys or seed phrases
   - Urgent action required messages
   - Links to suspicious websites
   - Requests to download unknown software

3. **Reporting**
   - Forward suspicious emails to security@yieldrails.com
   - Report phishing attempts to help protect the community
   - Never click links in suspicious messages

---

## Contact Support

### Before Contacting Support

**Gather Information**:
- Account email address
- Transaction hashes (if applicable)
- Screenshots of error messages
- Browser and device information
- Steps to reproduce the issue

### Support Channels

#### Live Chat
- Available 24/7 in the platform
- Fastest response for urgent issues
- Best for account-specific problems

#### Email Support
- **General**: support@yieldrails.com
- **Technical**: technical@yieldrails.com
- **Security**: security@yieldrails.com
- **API**: api-support@yieldrails.com

#### Community Support
- **Discord**: [discord.gg/yieldrails](https://discord.gg/yieldrails)
- **Telegram**: [@YieldRailsOfficial](https://t.me/YieldRailsOfficial)
- **Reddit**: [r/YieldRails](https://reddit.com/r/YieldRails)

### Response Times
- **Critical Issues**: Within 1 hour
- **General Inquiries**: Within 4 hours
- **Technical Questions**: Within 24 hours

### Escalation Process
1. First contact: Support agent
2. Technical issues: Engineering team
3. Complex cases: Senior support
4. Disputes: Management review

---

## Additional Resources

### Documentation
- **User Guide**: [docs.yieldrails.com/user-guide](https://docs.yieldrails.com/user-guide)
- **API Docs**: [docs.yieldrails.com/api](https://docs.yieldrails.com/api)
- **Security**: [docs.yieldrails.com/security](https://docs.yieldrails.com/security)

### Status and Updates
- **Status Page**: [status.yieldrails.com](https://status.yieldrails.com)
- **Blog**: [blog.yieldrails.com](https://blog.yieldrails.com)
- **Twitter**: [@YieldRails](https://twitter.com/YieldRails)

### Educational Content
- **Academy**: [academy.yieldrails.com](https://academy.yieldrails.com)
- **YouTube**: [youtube.com/yieldrails](https://youtube.com/yieldrails)
- **Webinars**: Check Discord for announcements

---

**Remember**: Never share your private keys, seed phrases, or passwords with anyone, including support staff. YieldRails will never ask for this information.