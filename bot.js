const { Telegraf } = require('telegraf');
const { GameDig } = require('gamedig');

// ដាក់ Token របស់ Bot របស់អ្នក
const bot = new Telegraf('8969303877:AAEZ5f2BpPLnJ6sYbiGQBHXBwMB0JFBZbnE');

// កំណត់ប្រភេទហ្គេម (ឧទាហរណ៍: fivem, minecraft, csgo, samp)
const GAME_TYPE = 'fivem'; 

bot.start((ctx) => {
    ctx.reply('សួស្តី! សូមផ្ញើ IP (និង Port) របស់ Server មកកាន់ខ្ញុំ ដើម្បីឆែកមើល។\nឧទាហរណ៍៖ 123.45.67.89:30120');
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    // មិនឲ្យវាដំណើរការបើសិនជា Command (ចាប់ផ្តើមដោយសញ្ញា /)
    if (text.startsWith('/')) return;

    const [ip, port] = text.split(':');
    
    if (!ip) {
        return ctx.reply('សូមបញ្ចូល IP ឲ្យបានត្រឹមត្រូវ។');
    }

    const message = await ctx.reply('⏳ កំពុងឆែកមើល Server...');

    try {
        const state = await GameDig.query({
            type: GAME_TYPE,
            host: ip,
            port: port ? parseInt(port) : undefined
        });

        let replyText = `✅ **Server Online**\n`;
        replyText += `🌐 ឈ្មោះ: ${state.name}\n`;
        replyText += `👥 អ្នកលេង: ${state.players.length} / ${state.maxplayers}\n`;
        replyText += `📶 Ping: ${state.ping}ms\n`;

        // បង្ហាញបញ្ជីឈ្មោះអ្នកលេង
        if (state.players.length > 0) {
            replyText += `\n**បញ្ជីឈ្មោះអ្នកលេង:**\n`;
            // បង្ហាញឈ្មោះអ្នកលេងត្រឹម ១០នាក់ដំបូង ដើម្បីកុំឲ្យសារវែងពេក
            state.players.slice(0, 10).forEach((player, index) => {
                replyText += `${index + 1}. ${player.name || 'Unknown'}\n`;
            });
            if (state.players.length > 10) replyText += `...និង ${state.players.length - 10} នាក់ទៀត`;
        } else {
            replyText += `\nគ្មានអ្នកលេងកំពុង Online ទេ។`;
        }

        ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, replyText);

    } catch (error) {
        ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, `❌ **Server Offline** ឬមិនអាចទាក់ទងបានទេ។`);
    }
});

bot.launch().then(() => {
    console.log('Bot កំពុងដំណើរការ...');
});

// ការពារការគាំងពេលបិទ Bot
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
