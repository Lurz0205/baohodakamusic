// commands/nodes.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config'); // Import config để lấy danh sách nodes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Hiển thị trạng thái của các Lavalink node.'), // Cập nhật mô tả
    async execute(interaction, player) {
        await interaction.deferReply();

        let description = 'Trạng thái Lavalink Nodes:\n\n';

        if (config.LAVALINK_NODES.length === 0) {
            description += 'Không có Lavalink node nào được cấu hình trong config.js.';
        } else {
            description += '**Nodes đã cấu hình:**\n';
            config.LAVALINK_NODES.forEach((nodeConfig, index) => {
                const connectedNode = player.nodes.cache.get(nodeConfig.id); // Cố gắng tìm node trong cache theo ID
                const isConnected = connectedNode ? connectedNode.connected : false;

                description += `\`${index + 1}.\` **Host:** \`${nodeConfig.host}:${nodeConfig.port}\`\n`;
                description += `   **Trạng thái:** ${isConnected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}\n`;
                if (isConnected) {
                    description += `   **ID:** \`${connectedNode.id}\`\n`;
                    description += `   **Ping:** \`${connectedNode.ping}ms\`\n`;
                    description += `   **Players:** \`${connectedNode.stats?.players || 0}\` đang hoạt động\n`;
                    description += `   **CPU:** \`${(connectedNode.stats?.cpu?.systemLoad * 100 || 0).toFixed(2)}%\`\n`;
                    description += `   **RAM:** \`${(connectedNode.stats?.memory?.used / 1024 / 1024 || 0).toFixed(2)}MB\`\n`;
                }
                description += '\n';
            });
        }

        // Thêm thông tin tổng quan về các node đang kết nối
        description += `\n**Tổng số node đang kết nối:** ${player.nodes.cache.size}\n`;

        return interaction.editReply({
            embeds: [{
                title: 'Trạng thái Lavalink Nodes',
                description: description,
                color: interaction.client.config.EMBED_COLOR,
                footer: { text: 'Bot sẽ cố gắng kết nối với Lavalink node khi có yêu cầu phát nhạc.' }
            }]
        });
    },
};
