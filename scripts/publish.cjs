
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

// Helper to run commands
function run(command) {
    try {
        console.log(`\n> ${command}`);
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        return false;
    }
}

// 1. Read current version
const packageJson = require(PACKAGE_JSON_PATH);
const currentVersion = packageJson.version;

console.log(`\n📦 Prime Solution Invoicer - Release Manager`);
console.log(`Current Version: ${currentVersion}`);
console.log('-----------------------------------');
console.log('1. Patch (Bug fix: 1.0.0 -> 1.0.1)');
console.log('2. Minor (New Feature: 1.0.0 -> 1.1.0)');
console.log('3. Major (Breaking Change: 1.0.0 -> 2.0.0)');
console.log('0. Cancel');

rl.question('\nSelect update type (0-3): ', (answer) => {
    if (answer === '0') {
        console.log('Cancelled.');
        rl.close();
        process.exit(0);
    }

    let newVersion = currentVersion;
    const parts = currentVersion.split('.').map(Number);

    if (answer === '1') parts[2]++;
    else if (answer === '2') { parts[1]++; parts[2] = 0; }
    else if (answer === '3') { parts[0]++; parts[1] = 0; parts[2] = 0; }
    else {
        console.log('Invalid selection.');
        rl.close();
        process.exit(1);
    }

    newVersion = parts.join('.');
    console.log(`\n🚀 Preparing to release version: ${newVersion}`);

    // Confirm
    rl.question('Press ENTER to continue...', () => {

        // 2. Update package.json
        packageJson.version = newVersion;
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
        console.log(`\n✅ Updated package.json to ${newVersion}`);

        // 3. Push to GitHub (Triggers Netlify Update)
        console.log('\n☁️  Pushing changes to GitHub...');
        run('git add .');
        run(`git commit -m "chore: release v${newVersion}"`);
        run('git push');

        // 4. Build React App
        console.log('\n🔨 Building Application...');
        if (!run('npm run build')) {
            console.error('Build failed!');
            process.exit(1);
        }

        // 5. Publish to GitHub (requires GH_TOKEN env var or .env file)
        console.log('\n📤 Publishing to GitHub Releases...');

        const publishCmd = 'npm run electron:build -- --publish always';

        try {
            execSync(publishCmd, { stdio: 'inherit' });
            console.log(`\n✨ Success! Version ${newVersion} has been published.`);
            console.log('Your friend should see the update popup next time they open the app.');
            console.log('Netlify/Website should also be updating now.');
        } catch (err) {
            console.error('\n❌ Publishing failed. Please check your GitHub Token and internet connection.');
            console.error('Make sure you have set the GH_TOKEN environment variable.');
        }

        rl.close();
    });
});
