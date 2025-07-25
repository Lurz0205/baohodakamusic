// commands/nodes.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Hiển thị trạng thái của các Lavalink node.'),
    async execute(interaction, player) {
        await interaction.deferReply();

        // Trong discord-player v7.x, player.nodes.cache là một Collection
        const nodes = player.nodes.cache;
        if (!nodes || nodes.size === 0) {
            return interaction.editReply({ content: 'Không có Lavalink node nào được cấu hình hoặc kết nối.' });
        }

        let description = 'Trạng thái Lavalink Nodes:\n';
        nodes.forEach(node => {
            description += `\n**ID:** \`${node.id}\`\n`;
            description += `**Host:** \`${node.host}:${node.port}\`\n`;
            description += `**Trạng thái:** ${node.connected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}\n`;
            if (node.connected) {
                description += `**Ping:** \`${node.ping}ms\`\n`;
                description += `**Players:** \`${node.stats.players}\` đang hoạt động\n`;
                description += `**CPU:** \`${(node.stats.cpu.systemLoad * 100).toFixed(2)}%\`\n`;
                description += `**RAM:** \`${(node.stats.memory.used / 1024 / 1024).toFixed(2)}MB\`\n`;
            }
        });

        return interaction.editReply({
            embeds: [{
                title: 'Trạng thái Lavalink Nodes',
                description: description,
                color: interaction.client.config.EMBED_COLOR,
                footer: { text: `Tổng số node: ${nodes.size}` }
            }]
        });
    },
};
