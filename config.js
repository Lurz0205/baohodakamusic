// config.js
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN',
    CLIENT_ID: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
    GUILD_ID: process.env.GUILD_ID || 'YOUR_GUILD_ID',
    EMBED_COLOR: 0x0099ff, // Định dạng số nguyên thập lục phân

    LAVALINK_NODES: [
        {
            id: 'AjieDev-V3', // Trong v7.x, cần có ID
            host: 'lava-v3.ajieblogs.eu.org',
            port: 443,
            authorization: 'https://dsc.gg/ajidevserver', // Mật khẩu là link Discord
            secure: true
        },
        {
            id: 'Serenetia-V3',
            host: 'lavalinkv3-id.serenetia.com',
            port: 443,
            authorization: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            id: 'AjieDev-V4',
            host: 'lava-v4.ajieblogs.eu.org',
            port: 443,
            authorization: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            id: 'Fedot_Compot-main',
            host: 'lavalink.fedotcompot.net',
            port: 443,
            authorization: 'https://discord.gg/bXXCZzKAyp',
            secure: true
        },
        {
            id: 'Serenetia-V4',
            host: 'lavalinkv4.serenetia.com',
            port: 443,
            authorization: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            id: 'INZEWORLD.COM (DE)',
            host: 'lava.inzeworld.com',
            port: 3128,
            authorization: 'saher.inzeworld.com',
            secure: false
        },
        {
            id: 'RY4N',
            host: '89.251.21.22',
            port: 25691,
            authorization: 'youshallnotpass',
            secure: false
        },
        {
            id: 'RY4N X ARINO',
            host: '79.110.236.32',
            port: 9033,
            authorization: 'discord.gg/W2GheK3F9m',
            secure: false
        },
        {
            id: 'AjieDev-LDP-NonSSL',
            host: 'lava-all.ajieblogs.eu.org',
            port: 80,
            authorization: 'https://dsc.gg/ajidevserver',
            secure: false
        },
        {
            id: 'Serenetia-LDP-NonSSL',
            host: 'lavalink.serenetia.com',
            port: 80,
            authorization: 'https://dsc.gg/ajidevserver',
            secure: false
        }
    ]
};
