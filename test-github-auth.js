#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error('❌ GITHUB_TOKEN not set');
    process.exit(1);
}

const octokit = new Octokit({ auth: token });

try {
    const { data: user } = await octokit.users.getAuthenticated();
    console.log('✅ GitHub authentication successful!');
    console.log(`Logged in as: ${user.login}`);
    console.log(`Name: ${user.name || 'Not set'}`);
    console.log(`Public repos: ${user.public_repos}`);
    
    // Check permissions
    const { data: rateLimit } = await octokit.rateLimit.get();
    console.log(`\nAPI Rate Limit: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
    
} catch (error) {
    console.error('❌ GitHub authentication failed:', error.message);
    console.error('Please check your token and try again');
}