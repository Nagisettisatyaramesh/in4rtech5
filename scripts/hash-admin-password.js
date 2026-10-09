const bcrypt = require('bcryptjs');

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Run this helper in a terminal so your password can be entered privately.');
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = '';
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    const onData = (buffer) => {
      for (const character of buffer.toString('utf8')) {
        if (character === '\u0003') {
          input.off('data', onData);
          input.setRawMode(false);
          process.stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          input.off('data', onData);
          input.setRawMode(false);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    };
    input.on('data', onData);
  });
}

(async () => {
  try {
    const password = await readHidden('Choose an admin password (input is hidden): ');
    if (password.length < 12) throw new Error('Use at least 12 characters for the admin password.');
    const confirmation = await readHidden('Enter it again: ');
    if (password !== confirmation) throw new Error('The passwords do not match.');
    const hash = await bcrypt.hash(password, 12);
    console.log('\nCopy this hash into ADMIN_PASSWORD_HASH in your .env file:\n');
    console.log(hash);
    console.log('\nThe plain password was not saved.');
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  } finally {
    if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
})();
