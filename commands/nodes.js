// commands/nodes.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config'); // Import config để lấy danh sách nodes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Hiển thị trạng thái của các Lavalink node.'),
    async execute(interaction, lavalink) { // Nhận lavalink instance
        await interaction.deferReply();

        let description = 'Trạng thái Lavalink Nodes:\n\n';

        if (lavalink.nodes.size === 0) {
            description += 'Không có Lavalink node nào được cấu hình trong Lavalink Manager.';
        } else {
            description += '**Nodes đã cấu hình:**\n';
            lavalink.nodes.forEach((node, index) => {
                description += `\`${index + 1}.\` **ID:** \`${node.id}\`\n`;
                description += `   **Host:** \`${node.host}:${node.port}\`\n`;
                description += `   **Trạng thái:** ${node.connected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}\n`;
                if (node.connected) {
                    description += `   **Ping:** \`${node.ping}ms\`\n`;
                    description += `   **Players:** \`${node.stats?.players || 0}\` đang hoạt động\n`;
                    description += `   **CPU:** \`${(node.stats?.cpu?.systemLoad * 100 || 0).toFixed(2)}%\`\n`;
                    description += `   **RAM:** \`${(node.stats?.memory?.used / 1024 / 1024 || 0).toFixed(2)}MB\`\n`;
                }
                description += '\n';
            });
        }

        description += `\n**Tổng số node đang kết nối:** ${lavalink.nodes.filter(node => node.connected).size}\n`;

        return interaction.editReply({
            embeds: [{
                title: 'Trạng thái Lavalink Nodes',
                description: description,
                color: interaction.client.config.EMBED_COLOR,
                footer: { text: 'Bot sẽ tự động kết nối với Lavalink node khi cần.' }
            }]
        });
    },
};
