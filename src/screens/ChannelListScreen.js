// src/screens/ChannelListScreen.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

// default channels shown on the list
const defaultChannels = [
  { id: 'general', name: '#general', description: 'Campus-wide general chat' },
  { id: 'study-groups', name: '#study-groups', description: 'Form study groups' },
  { id: 'announcements', name: '#announcements', description: 'Official announcements' },
  { id: 'random', name: '#random', description: 'Fun and casual chat' },
];

export default function ChannelListScreen({ navigation }) {
  const { theme } = useTheme(); // palette from ThemeContext

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
        Channels
      </Text>

      {/* list out the four default rooms; tap to open Chat screen */}
      {defaultChannels.map((ch) => (
        <List.Item
          key={ch.id}
          title={ch.name}
          description={ch.description}
          left={(props) => <List.Icon {...props} icon="message-text" />}
          onPress={() => navigation.navigate('Chat', { channelId: ch.id, channelName: ch.name })}
          style={[styles.item, { backgroundColor: theme.card }]}
          titleStyle={{ color: theme.text }}
          descriptionStyle={{ color: theme.subText }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginVertical: 16 },
  item: { marginBottom: 8, borderRadius: 12 },
});
