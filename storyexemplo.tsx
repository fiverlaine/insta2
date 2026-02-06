import { useRouter } from "expo-router";
import { X, Heart, Send, MoreHorizontal } from "lucide-react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { storiesData } from "@/mocks/stories";
import { profileData } from "@/mocks/profile";

const { width, height } = Dimensions.get("window");

export default function StoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(profileData.isFollowing);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnims = useRef(storiesData.map(() => new Animated.Value(0))).current;
  const currentStory = storiesData[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < storiesData.length - 1) {
      progressAnims[currentIndex].setValue(1);
      setCurrentIndex(currentIndex + 1);
    } else {
      router.back();
    }
  }, [currentIndex, progressAnims, router]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      progressAnims[currentIndex].setValue(0);
      setCurrentIndex(currentIndex - 1);
      progressAnims[currentIndex - 1].setValue(0);
    }
  }, [currentIndex, progressAnims]);

  useEffect(() => {
    if (isPaused) return;

    const duration = currentStory.duration;
    const animation = Animated.timing(progressAnims[currentIndex], {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      animation.stop();
    };
  }, [currentIndex, isPaused, currentStory.duration, progressAnims, handleNext]);

  const handleTapLeft = () => {
    handlePrevious();
  };

  const handleTapRight = () => {
    handleNext();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderRelease: () => {
        setIsPaused(false);
      },
    })
  ).current;

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      <View style={styles.storyContent}>
        <Image source={{ uri: currentStory.media }} style={styles.storyImage} />
      </View>
      
      <View style={styles.overlay}>
        <View style={[styles.topSection, { paddingTop: insets.top + 8 }]}>
          <View style={styles.progressContainer}>
            {storiesData.map((_, index) => (
              <View key={index} style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                      index < currentIndex && { width: "100%" },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
              </View>
              <Text style={styles.username} numberOfLines={1}>
                {profileData.username}
              </Text>
              <Text style={styles.time}>2 min</Text>
            </View>

            <View style={styles.headerActions}>
              {!isFollowing && (
                <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
                  <Text style={styles.followButtonText}>Seguir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.moreButton}>
                <MoreHorizontal color="#fff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <X color="#fff" size={28} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.tapAreas}>
          <TouchableOpacity
            style={styles.tapLeft}
            onPress={handleTapLeft}
            activeOpacity={1}
          />
          <View
            style={styles.tapCenter}
            {...panResponder.panHandlers}
          />
          <TouchableOpacity
            style={styles.tapRight}
            onPress={handleTapRight}
            activeOpacity={1}
          />
        </View>

        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.footer}>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Enviar mensagem..."
                placeholderTextColor="#999"
                editable={false}
              />
            </View>
            <TouchableOpacity style={styles.footerButton}>
              <Heart color="#fff" size={28} fill="transparent" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton}>
              <Send color="#fff" size={28} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  storyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width,
    height: width * (16 / 9),
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topSection: {
    paddingBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    gap: 4,
    marginBottom: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  username: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
    maxWidth: 150,
  },
  time: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  followButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  moreButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  tapAreas: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  tapLeft: {
    flex: 1,
  },
  tapCenter: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  bottomSection: {
    paddingTop: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  messageInputContainer: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#fff",
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  messageInput: {
    color: "#fff",
    fontSize: 14,
  },
  footerButton: {
    padding: 4,
  },
});
