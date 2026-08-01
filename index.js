const { Telegraf } = require('telegraf');
const { GameDig } = require('gamedig');

// ១. ដាក់ Token របស់ Bot របស់អ្នកនៅទីនេះ
const bot = new Telegraf('8969303877:AAEZ5f2BpPLnJ6sYbiGQBHXBwMB0JFBZbnE');

// ២. កំណត់ប្រភេទហ្គេម (ឧទាហរណ៍: fivem, minecraft, csgo, samp)
const GAME_TYPE = 'minecraft'; 

// ៣. Command /start ជាមួយសារស្វាគមន៍
bot.start((ctx) => {
    const welcomeMessage = `👋 **សួស្តី!**\n\nសូមបញ្ជូល \`IP:Port\` របស់ Server មកកាន់ខ្ញុំ ដើម្បីឆែកមើលថាវា Online ឬ Offline និងមានអ្នកលេងប៉ុន្មាននាក់។\n\n👉 *ឧទាហរណ៍៖ 123.45.67.89:30120*`;
    
    // ប្រើ parse_mode: 'Markdown' ដើម្បីឲ្យវាស្គាល់អក្សរដិត និងទ្រេត
    ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

// ៤. មុខងារឆែក Server ពេលអ្នកប្រើប្រាស់បញ្ចុល IP
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    // មិនឲ្យវាដំណើរការបើសិនជា Command (ចាប់ផ្តើមដោយសញ្ញា /)
    if (text.startsWith('/')) return;

    // បំបែក IP និង Port
    const [ip, port] = text.split(':');
    
    if (!ip) {
        return ctx.reply('⚠️ សូមបញ្ចូល IP ឲ្យបានត្រឹមត្រូវ។');
    }

    // ផ្ញើសាររង់ចាំ
    const message = await ctx.reply('⏳ កំពុងឆែកមើល Server...');

    try {
        // ទាញយកទិន្នន័យពី Server
        const state = await GameDig.query({
            type: GAME_TYPE,
            host: ip,
            port: port ? parseInt(port) : undefined
        });

        // រៀបចំសារសម្រាប់បង្ហាញលទ្ធផល
        let replyText = `✅ **Server Online**\n\n`;
        replyText += `🌐 **ឈ្មោះ:** ${state.name}\n`;
        replyText += `👥 **អ្នកលេង:** ${state.players.length} / ${state.maxplayers}\n`;
        replyText += `📶 **Ping:** ${state.ping}ms\n`;

        // បង្ហាញបញ្ជីឈ្មោះអ្នកលេង
        if (state.players.length > 0) {
            replyText += `\n📋 **បញ្ជីឈ្មោះអ្នកលេង:**\n`;
            
            // បង្ហាញឈ្មោះអ្នកលេងត្រឹម ១០នាក់ដំបូង
            state.players.slice(0, 10).forEach((player, index) => {
                replyText += `${index + 1}. ${player.name || 'Unknown'}\n`;
            });
            
            // ប្រសិនបើមានលើសពី ១០ នាក់
            if (state.players.length > 10) {
                replyText += `...និង ${state.players.length - 10} នាក់ទៀត`;
            }
        } else {
            replyText += `\nគ្មានអ្នកលេងកំពុង Online ទេ។`;
        }

        // កែប្រែសាររង់ចាំ ទៅជាសារលទ្ធផលវិញ
        ctx.telegram.editMessageText(
            ctx.chat.id, 
            message.message_id, 
            undefined, 
            replyText, 
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        // បើឆែកមិនចេញ ឬ Error
        ctx.telegram.editMessageText(
            ctx.chat.id, 
            message.message_id, 
            undefined, 
            `❌ **Server Offline** ឬមិនអាចទាក់ទងបានទេ។ សូមពិនិត្យមើល IP និង Port ម្តងទៀត។`, 
            { parse_mode: 'Markdown' }
        );
    }
});

// ៥. ចាប់ផ្តើមឲ្យ Bot ដំណើរការ
bot.launch().then(() => {
    console.log('✅ Bot កំពុងដំណើរការដោយជោគជ័យ...');
});

// ៦. ការពារការគាំងពេលបិទ Bot (Graceful stop)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
