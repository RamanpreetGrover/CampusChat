// Chat screen for a single channel. Shows messages in real-time, lets me send text
// and upload an image. I’m using the React Native Firebase modular API so there are
// no deprecation warnings (ref(storage, ...), putFile(), getDownloadURL(), etc.).

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  List,
  Appbar,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

// Firebase singletons (created in src/services/firebase.js)
import { auth, db, storage } from '../services/firebase';

// Firestore (modular): I’m importing only what I need
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  documentId,
} from '@react-native-firebase/firestore';

// Storage (modular): build a reference, upload file, and read the download URL
import { ref, getDownloadURL } from '@react-native-firebase/storage';
// Note: putFile() is a method on the reference (RNFirebase native upload API)
import { launchImageLibrary } from 'react-native-image-picker';

export default function ChatScreen({ route, navigation }) {
  // Params passed from ChannelList
  const { channelId, channelName } = route.params || {};

  // Theme colors (from ThemeContext) so the UI adapts to light/dark
  const { theme } = useTheme();

  // ---- Local screen state ----
  // messages: array of docs from Firestore for this channel
  const [messages, setMessages] = useState([]);
  // presence: quick map userId -> 'online' | 'offline' (pulled from users collection)
  const [presence, setPresence] = useState({});
  // input: the message text I'm typing
  const [input, setInput] = useState('');
  // uploading: shows a spinner while an image is being uploaded
  const [uploading, setUploading] = useState(false);
  // photoURL: current user's avatar (if saved under /users/<uid>.photoURL)
  const [photoURL, setPhotoURL] = useState(null);

  // used to auto-scroll to the latest message when new data arrives
  const flatListRef = useRef(null);

  // ────────────────────────────────────────────────────────────────────────────────
  // Load current user's small profile data (just photoURL for now).
  // I subscribed instead of doing a one-time get because photo can change.
  // If I ever add a "Change Avatar" on Profile, the header updates live.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return; // not logged in (shouldn't happen on this screen)

    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setPhotoURL(snap.data().photoURL || null);
    });

    return unsub;
  }, []);

  // ────────────────────────────────────────────────────────────────────────────────
  // Custom header: shows back button, channel title, # online, attach icon, and my avatar.
  // I re-run this when presence count or my photo changes.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onlineCount = Object.values(presence).filter((s) => s === 'online').length;

    navigation.setOptions({
      headerShown: true,
      header: () => (
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={channelName || '#channel'} subtitle={`${onlineCount} online`} />
          {/* Attach image */}
          <Appbar.Action icon="paperclip" onPress={pickAndUpload} />
          {/* Profile: if I have a photoURL show it, otherwise use initial from email */}
          <Appbar.Action
            icon={() =>
              photoURL ? (
                <Avatar.Image size={32} source={{ uri: photoURL }} />
              ) : (
                <Avatar.Text
                  size={32}
                  label={(auth.currentUser?.email?.[0] || 'U').toUpperCase()}
                />
              )
            }
            onPress={() => navigation.navigate('Profile')}
          />
        </Appbar.Header>
      ),
    });
  }, [navigation, channelName, presence, photoURL]);

  // ────────────────────────────────────────────────────────────────────────────────
  // Real-time message stream for the selected channel.
  // I filter by channelId and order by createdAt ascending so it reads top → bottom.
  // After data comes in, I scroll to the end so the newest message is visible.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!channelId) return;

    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);

      // give the FlatList a tick to layout before scrolling
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });

    return unsub;
  }, [channelId]);

  // ────────────────────────────────────────────────────────────────────────────────
  // Presence: when I have messages, I collect the unique userIds and watch the
  // corresponding user docs in /users. I batch queries in chunks of 10 for the
  // 'in' filter (Firestore has a limit). If a user doc has a 'status' field,
  // I map it to the little green/grey dot.
  // ────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;

    // unique user IDs from the message list
    const uids = Array.from(new Set(messages.map((m) => m.userId).filter(Boolean)));
    const unsubs = [];

    for (let i = 0; i < uids.length; i += 10) {
      const batch = uids.slice(i, i + 10);
      const q = query(collection(db, 'users'), where(documentId(), 'in', batch));

      const u = onSnapshot(q, (snap) => {
        setPresence((prev) => {
          const next = { ...prev };
          snap.forEach((d) => {
            next[d.id] = d.data()?.status || 'offline';
          });
          return next;
        });
      });

      unsubs.push(u);
    }

    return () => unsubs.forEach((fn) => fn());
  }, [messages]);

  // ────────────────────────────────────────────────────────────────────────────────
  // Send a plain text message. I also update my /users/<uid> doc so presence
  // can show "online" and a fresh lastSeen. (merge:true keeps any other fields.)
  // ────────────────────────────────────────────────────────────────────────────────
  const sendText = async () => {
    const user = auth.currentUser;
    if (!user || !input.trim()) return;

    await addDoc(collection(db, 'messages'), {
      text: input.trim(),
      userId: user.uid,
      username: user.email,
      channelId,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'users', user.uid),
      { email: user.email, status: 'online', lastSeen: serverTimestamp() },
      { merge: true }
    );

    setInput('');
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Pick an image from the gallery and upload it to Firebase Storage.
  // Notes:
  // - image-picker returns a file:// URI on Android; putFile() needs a raw path,
  //   so I strip the scheme if present.
  // - I generate a unique path per user using the timestamp.
  // - After upload, I get a public downloadURL and store a message that references it.
  // ────────────────────────────────────────────────────────────────────────────────
  async function pickAndUpload() {
    const user = auth.currentUser;
    if (!user) return;

    // Open gallery
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = res?.assets?.[0];
    if (!asset?.uri) return;

    try {
      setUploading(true);

      // Storage path: images/<uid>/<timestamp>.jpg
      const storagePath = `images/${user.uid}/${Date.now()}.jpg`;
      const fileRef = ref(storage, storagePath);

      // On Android, URIs usually look like file:///... ; putFile() accepts a plain path
      const filePath = asset.uri.startsWith('file://') ? asset.uri.replace('file://', '') : asset.uri;

      // Native upload (RNFirebase): putFile() lives on the reference
      await fileRef.putFile(filePath);

      // Read the URL we’ll use in the chat message
      const downloadURL = await getDownloadURL(fileRef);

      // Save a message that points to the uploaded image
      await addDoc(collection(db, 'messages'), {
        text: '', // no text, just an image
        imageUrl: downloadURL,
        userId: user.uid,
        username: user.email,
        channelId,
        createdAt: serverTimestamp(),
      });

      // small presence bump
      await setDoc(
        doc(db, 'users', user.uid),
        { email: user.email, status: 'online', lastSeen: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Render a single message item. I show:
  // - username as the title
  // - either the message text OR the image (or both if I ever allow both)
  // - a tiny presence dot and the time on the right
  // ────────────────────────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const status = presence[item.userId] || 'offline';
    const dotColor = status === 'online' ? '#4CAF50' : '#9E9E9E';

    const rightTime =
      item.createdAt?.toDate && (
        <List.Subheader style={{ color: theme.subText }}>
          {item.createdAt.toDate().toLocaleTimeString()}
        </List.Subheader>
      );

    return (
      <List.Item
        title={item.username || 'Anon'}
        titleStyle={{ color: theme.text }}
        description={() => (
          <>
            {item.text ? (
              <List.Subheader style={{ color: theme.subText }}>{item.text}</List.Subheader>
            ) : null}

            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 8,
                  marginTop: item.text ? 8 : 0,
                }}
                resizeMode="cover"
              />
            ) : null}
          </>
        )}
        descriptionNumberOfLines={0}
        left={(props) => <List.Icon {...props} icon="circle" color={dotColor} />}
        right={() => rightTime}
        style={{ backgroundColor: theme.card }}
      />
    );
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // Layout: FlatList for messages, input row at the bottom, and a small spinner
  // while an image is uploading. I wrap everything in KeyboardAvoidingView so the
  // input stays above the keyboard on iOS.
  // ────────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />

        <View style={styles.row}>
          <TextInput
            mode="outlined"
            style={{ flex: 1, marginRight: 8 }}
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${channelName || '#channel'}`}
          />
          <Button mode="contained" onPress={sendText} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Send'}
          </Button>
        </View>

        {uploading && (
          <View style={{ paddingHorizontal: 8, paddingBottom: 6 }}>
            <ActivityIndicator animating />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  row: { flexDirection: 'row', padding: 8, alignItems: 'center' },
});
