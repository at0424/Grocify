import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, ImageBackground, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');


// --- PIXEL ART PERSPECTIVE CEILING ---
const WoodCeiling = ({ containerWidth, animatedTranslateX }) => {
  const rows = 10;
  const cols = 40;
  const grid = [];

  const rowHeight = 30;

  for (let r = 0; r < rows; r++) {
    let rowBlocks = [];
    for (let c = 0; c < cols; c++) {
      const isDark = c % 2 === 0; 
      rowBlocks.push(
        <View
          key={`${r}-${c}`}
          style={{ 
            flex: 1, 
            backgroundColor: isDark ? '#4a2f1d' : '#5c3a21', 
            borderBottomWidth: 2,
            borderColor: '#2e1c10' 
          }}
        />
      );
    }
    grid.push(
      <View key={r} style={{ height: rowHeight, flexDirection: 'row', width: containerWidth * 5 }}>
        {rowBlocks}
      </View>
    );
  }

  return (
    <View style={styles.ceilingPerspective}>
      <Animated.View style={{ transform: [{ translateX: animatedTranslateX }] }}>
        {grid}
      </Animated.View>
    </View>
  );
};

// --- PIXEL ART PERSPECTIVE FLOOR ---
const CheckeredFloor = ({ containerWidth, animatedTranslateX }) => {
  const rows = 14;
  const cols = 35;
  const grid = [];

  const rowHeight = 40;

  for (let r = 0; r < rows; r++) {
    let rowBlocks = [];
    for (let c = 0; c < cols; c++) {
      const isDark = (r + c) % 2 === 0;
      rowBlocks.push(
        <View
          key={`${r}-${c}`}
          style={{ flex: 1, backgroundColor: isDark ? '#5c707d' : '#d1d8dd' }}
        />
      );
    }
    grid.push(
      <View key={r} style={{ height: rowHeight, flexDirection: 'row', width: containerWidth * 5 }}>
        {rowBlocks}
      </View>
    );
  }

  return (
    <View style={styles.floorPerspective}>
      <Animated.View style={{ transform: [{ translateX: animatedTranslateX }] }}>
        {grid}
      </Animated.View>
    </View>
  );
};

// --- MAIN DASHBOARD SCREEN ---
export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");
  const [isTabletView, setIsTabletView] = useState(Dimensions.get('window').width > 600);

  // STATE FOR ACTIVE ROOM
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    checkUser();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsTabletView(window.width > 600);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    checkUser();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsTabletView(window.width > 600);
    });

    return () => subscription?.remove();
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      setUserEmail(user.username || "User");
    } catch (err) {
      setUserEmail("Guest");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/sign_in");
    } catch (err) {
      Alert.alert("Error", "Failed to sign out.");
    }
  }

  const sceneWidth = isTabletView ? width * 0.75 : width;

  // ===============================
  // Animation
  // ===============================

  // For horizontal scrolling
  const scrollViewRef = useRef(null);
  const scrollToRoom = (roomIndex) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: roomIndex * sceneWidth, y: 0, animated: true });
    }
    setActiveIndex(roomIndex);
  };

  // Update index when user manually swipes
  const handleMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / sceneWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollX = useRef(new Animated.Value(0)).current; 
  const wallTranslateX = scrollX.interpolate({
    inputRange: [0, sceneWidth * 4], 
    outputRange: [0, -(sceneWidth * 4) * 0.5], 
    extrapolate: 'clamp',
  });
  const cityViewTranslateX = scrollX.interpolate({
    inputRange: [0, sceneWidth * 4], 
    outputRange: [0, -(sceneWidth * 4) * 0.2], 
    extrapolate: 'clamp',
  });

  // ===============================
  // Wiggle Animation
  // ===============================
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      wiggleAnim.setValue(0);
      Animated.sequence([
        Animated.timing(wiggleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 0, duration: 60, useNativeDriver: true })
      ]).start();
    }, 400); 

    return () => clearTimeout(timeout);
  }, [activeIndex, wiggleAnim]);

  const wiggleRotation = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1deg', '0deg', '1deg']
  });

  
  return (
    <View style={styles.container}>

      {/* --- GAME AREA (Holds Fixed Background + Swipeable Foreground) --- */}
      <View style={styles.gameArea}>

        {/* THE FIXED BACKGROUND */}
        <View style={styles.fixedBackgroundLayer}>

          {/* Ceiling */}
          <Animated.View style={styles.ceilingBackground}>
            <WoodCeiling containerWidth={width} animatedTranslateX={wallTranslateX} />
          </Animated.View>
          <Image
            source={require('@/assets/images/main_dashboard/WoodenLinen.png')}
            style={styles.woodenLinen}
            resizeMode="repeat"
          />

          {/* Wall Background */}
          <Animated.View style={[
            styles.wallBackground,
            { 
              width: width * 5, 
              transform: [{ translateX: wallTranslateX }] 
            }
          ]}>
            <ImageBackground
              source={
                Platform.OS === 'ios' 
                  ? require('@/assets/images/main_dashboard/BrickWall.png') 
                  : require('@/assets/images/main_dashboard/BrickWallZoomed.png')
              }
              style={styles.brickSection}
              resizeMode="repeat"
            />

            <ImageBackground
              source={require('@/assets/images/main_dashboard/PlainWainscoting.png')}
              style={styles.wainscotingSection}
              resizeMode="stretch"
            />

          </Animated.View>

          {/* THE FLOOR */}
          <View style={styles.floorBackground}>
            <CheckeredFloor containerWidth={width} animatedTranslateX={wallTranslateX} />
          </View>
        </View>

        {/* THE SWIPEABLE FOREGROUND */}
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={sceneWidth}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={styles.scrollLayer}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true } 
          )}
          scrollEventThrottle={16}
        >

          {/* ROOM 1: Door */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>

              {/* Hanging Light */}
              <View style={styles.hangingLightWrapper}>
                <Image
                  source={require('@/assets/images/main_dashboard/HangingLight.png')} 
                  style={styles.hangingLightImage} 
                  resizeMode="contain"
                />
              </View>
              
              {/* Light Beam */}
              <View style={styles.downwardBeamWrapper} pointerEvents="none">
                <Image
                  source={require('@/assets/images/main_dashboard/DownwardBeam.png')} 
                  style={styles.beamImage}
                  resizeMode="stretch"
                />
              </View>

              {/* Logout Light */}
              <View style={styles.logoutWrapper}>
                <Image
                  source={require('@/assets/images/main_dashboard/LogoutLight.png')} 
                  style={styles.hangingLightImage} 
                  resizeMode="contain"
                />
              </View>

              {/* Tall Flower Pot */}
              <View style={styles.tallFlowerPotWrapper} pointerEvents='none'>
                <Image
                  source={require('@/assets/images/main_dashboard/TallFlowerPot.png')} 
                  style={styles.tallPotImage} 
                  resizeMode="contain"
                />
              </View>

              {/* Animated Door Wrapper */}
              <Animated.View style={[
                styles.doorWrapper,
                activeIndex === 0 && { transform: [{ rotate: wiggleRotation }] }
              ]}>
                <TouchableOpacity onPress={handleSignOut} style={{ width: '100%', height: '100%' }} activeOpacity={0.8}>
                  <Image source={require('@/assets/images/main_dashboard/Door.png')} style={styles.doorImage} resizeMode="contain" />
                </TouchableOpacity>
              </Animated.View>

              {/* Cabinet */}
              <View style={[styles.bottomCabinetWrapper, { width: width * 0.5, right: - (width * 0.50) / 2, }]}>
                
                {/* Pot */}
                <Image
                  source={require('@/assets/images/main_dashboard/MediumFlowerPot.png')}
                  style={styles.mediumPotImage}
                  resizeMode="contain"
                />

                {/* Cabinet */}
                <Image
                  source={require('@/assets/images/main_dashboard/BottomCabinet3Drawer.png')}
                  style={styles.cabinetImage}
                  resizeMode="contain"
                />
              </View>

            </View>
          </View>

          {/* ROOM 2: Fridge */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>

              {/* Ceiling Cabinet */}
              <View style={styles.topCabinetWrapper}>
                <Image
                  source={require('@/assets/images/main_dashboard/CabinetTop.png')} 
                  style={styles.cabinetImage} 
                  resizeMode="contain"
                />
              </View>

              {/* Item on top of Fridge */}
              <View style={styles.fridgeTopRow}>
                {/* Cat */}
                <Image
                    source={require('@/assets/images/main_dashboard/Cat.gif')} 
                    style={[styles.fridgeTopImage, {aspectRatio:2, top: "10%"}]}
                    resizeMode="contain"
                  />
                {/* Pot */}
                <Image
                  source={require('@/assets/images/main_dashboard/FlowerPot1.png')} 
                  style={styles.fridgeTopImage}
                  resizeMode="contain"
                />
              </View>

              {/* Animated Fridge Wrapper */}
              <Animated.View style={[
                styles.fridgeWrapper, 
                activeIndex === 1 && { transform: [{ rotate: wiggleRotation }] }
              ]}>
                <TouchableOpacity onPress={() => router.push('./(freshness)')} style={{width: '100%', height: '100%'}} activeOpacity={0.8}>
                  <Image source={require('@/assets/images/main_dashboard/Fridge.png')} style={styles.fridgeImage} resizeMode="contain" />
                </TouchableOpacity>
              </Animated.View>
      
              {/* Window */}
              <View style={[styles.windowWrapper, isTabletView && styles.windowWrapperTablet]}>
                {/* City Sunset View */}
                <View style={styles.viewContainer}>
                  <Animated.Image                     
                    source={require('@/assets/images/main_dashboard/SunsetView.png')}
                    style={[
                      styles.viewImage, 
                      { 
                        width: '200%', 
                        left: 0,
                        transform: [{ translateX: cityViewTranslateX }] 
                      }
                    ]}
                    resizeMode="cover"
                  />
                </View>
                
                {/* Window Frame */}
                <Image
                  source={require('@/assets/images/main_dashboard/Window.png')}
                  style={styles.windowImage}
                  resizeMode="stretch"
                />

                {/* Light Beam */}
                <View style={styles.windowBeamWrapper} pointerEvents="none">
                  <Image
                    source={require('@/assets/images/main_dashboard/WindowBeamLight.png')}
                    style={styles.beamImage}
                    resizeMode="stretch"
                  />
                </View>

                {/* FlowerPot */}
                <Image
                  source={require('@/assets/images/main_dashboard/SmallFlowerPot.png')}
                  style={[styles.smallFlowerPotImage, isTabletView && styles.smallFlowerPotImageTablet]}
                  resizeMode="contain"
                />
              </View>
    
              {/* Cabinet */}
              <View style={styles.bottomCabinetWrapper}>
                <Image
                  source={require('@/assets/images/main_dashboard/CabinetBottom.png')}
                  style={styles.cabinetImage}
                  resizeMode="contain"
                />
              </View>


            </View>
          </View>

          {/* ROOM 3: Listing */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerBoard]}>

              {/* Hanging Cabinet */}
              <View style={[styles.topCabinetWrapper, {height:'25%', top: "6%"}]}>
                <Image
                  source={require('@/assets/images/main_dashboard/HangingCabinet.png')} 
                  style={styles.cabinetImage}
                  resizeMode="contain"
                />
              </View>
      
              {/* Animated Board Wrapper */}
              <Animated.View style={[
                styles.boardWrapper,
                activeIndex === 2 && { transform: [{ rotate: wiggleRotation }] }
              ]}>
                <TouchableOpacity onPress={() => router.push('./(listing)')} style={{ width: '100%', height: '100%' }} activeOpacity={0.8}>
                  <Image source={require('@/assets/images/main_dashboard/Board.png')} style={styles.boardImage} resizeMode="contain" />
                  <Image source={require('@/assets/images/main_dashboard/GroceriesListTag.png')} style={styles.boardTag} resizeMode="contain" />
                  <Image source={require('@/assets/images/main_dashboard/StickyNotes.png')} style={styles.stickyNotesOverBoard} resizeMode="contain" />
                </TouchableOpacity>
              </Animated.View>

              {/* Table */}
              <View style={styles.tableWrapper}>
                <Image
                  source={require('@/assets/images/main_dashboard/WorkingTable.png')}
                  style={styles.cabinetImage}
                  resizeMode="contain"
                />
              </View>

            </View>
          </View>

          {/* ROOM 4: Meal Plan */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerOven]}>
              
              {/* Hanging Shelf */}
              <View style={[styles.hangingShelfWrapper]}>
                <Image
                  source={require('@/assets/images/main_dashboard/HangingShelf.png')} 
                  style={styles.hangingShelfImage}
                  resizeMode="contain"
                />
              </View>

              {/* Wide Window */}
              <View style={styles.wideWindowWrapper}>
                {/* City Sunset View */}
                <View style={styles.viewContainer}>
                  <Animated.Image
                    source={require('@/assets/images/main_dashboard/SunsetView.png')}
                    style={[
                      styles.viewImage,
                      {
                        width: '200%',
                        left: 0,
                        transform: [{ translateX: cityViewTranslateX }] 
                      }
                    ]}
                    resizeMode="cover"
                  />
                </View>
                
                {/* Window Frame */}
                <Image
                  source={require('@/assets/images/main_dashboard/WindowWide.png')}
                  style={styles.windowImage}
                  resizeMode="stretch"
                />

                {/* Light Beam */}
                <View style={styles.wideWindowBeamWrapper} pointerEvents="none">
                  <Image
                    source={require('@/assets/images/main_dashboard/WindowBeamLight.png')}
                    style={styles.beamImage}
                    resizeMode="stretch"
                  />
                </View>
              </View>

              {/* Animated Oven Wrapper */}
              <Animated.View style={[
                styles.ovenWrapper, 
                activeIndex === 3 && { transform: [{ rotate: wiggleRotation }] }
              ]}>
                <TouchableOpacity onPress={() => router.push('./(meal_plan)')} style={{width: '100%', height: '100%'}} activeOpacity={0.8}>
                  <View style={styles.steamOverlayWrapper} pointerEvents="none">
                    <Image source={require('@/assets/images/main_dashboard/Steam.gif')} style={styles.steamImage} resizeMode="contain" />
                  </View>
                  <Image source={require('@/assets/images/main_dashboard/Oven.png')} style={styles.ovenImage} resizeMode="contain" />
                  <View style={styles.fireOverlayWrapper} pointerEvents="none">
                    <Image source={require('@/assets/images/main_dashboard/Fire.gif')} style={styles.fireImage} resizeMode="contain" />
                  </View>
                </TouchableOpacity>
              </Animated.View>

            </View>
          </View>

          {/* ROOM 5: AI */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>

              {/* Ceiling Cabinet */}
              <View style={[styles.topCabinetWrapper, {left: "20%"}]}>
                <Image
                  source={require('@/assets/images/main_dashboard/CabinetTop.png')} 
                  style={styles.cabinetImage} 
                  resizeMode="contain"
                />
              </View>

              {/* Window */}
              <View style={[
                styles.windowWrapper, 
                { 
                  alignSelf: 'center',
                  left: "40%",
                  zIndex: 0
                }
              ]}>
                {/* City Sunset View */}
                <View style={styles.viewContainer}>
                  <Animated.Image                     
                    source={require('@/assets/images/main_dashboard/SunsetView.png')}
                    style={[
                      styles.viewImage, 
                      { 
                        width: '400%',
                        left: 0, 
                        transform: [{ translateX: cityViewTranslateX }] 
                      }
                    ]}
                    resizeMode="cover"
                  />
                </View>
                
                {/* Window Frame */}
                <Image
                  source={require('@/assets/images/main_dashboard/Window.png')}
                  style={styles.windowImage}
                  resizeMode="stretch"
                />

                {/* Light Beam */}
                <View style={[
                  styles.windowBeamWrapper,
                  {
                    left: '-30%'
                  }
                ]}
                  pointerEvents="none"
                >
                  <Image
                    source={require('@/assets/images/main_dashboard/WindowBeamLight.png')}
                    style={styles.beamImage}
                    resizeMode="stretch"
                  />
                </View>
              </View>

              {/* Animated AI Wrapper */}
              <Animated.View style={[
                styles.AIWrapper, 
                activeIndex === 4 && { transform: [{ rotate: wiggleRotation }] }
              ]}>
                <TouchableOpacity onPress={() => router.push('./(ai)')} style={{width: '100%', height: '100%'}} activeOpacity={0.8}>
                  <Image source={require('@/assets/images/main_dashboard/AIBot.gif')} style={styles.AIImage} resizeMode="contain" />
                </TouchableOpacity>
              </Animated.View>

              {/* Long Bottom Cabinet */}
              <View style={styles.longBottomCabinetWrapper}>

                <Image
                  source={require('@/assets/images/main_dashboard/LongBottomCabinet.png')}
                  style={styles.cabinetImage}
                  resizeMode="contain"
                />

              </View>

            </View>
          </View>

        </Animated.ScrollView>

      </View>

      {/* --- FLOATING BOTTOM NAVIGATION BAR --- */}
      <BlurView intensity={30} tint="dark" style={styles.bottomNavBar}>
        
        <Pressable 
          onPress={() => scrollToRoom(0)} 
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
        >
          <Image
            source={(require('@/assets/images/main_dashboard/navigation_icon/LogoutIcon.png'))}
            style={styles.navIcon}
            resizeMode='contain'
          />
          <Text style={styles.navText}>Logout</Text>
        </Pressable>

        <Pressable 
          onPress={() => scrollToRoom(1)} 
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
        >
          <Image
            source={(require('@/assets/images/main_dashboard/navigation_icon/FreshnessIcon.png'))}
            style={styles.navIcon}
            resizeMode='contain'
          />
          <Text style={styles.navText}>Freshness</Text>
        </Pressable>

        <Pressable 
          onPress={() => scrollToRoom(2)} 
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
        >
          <Image
            source={(require('@/assets/images/main_dashboard/navigation_icon/ListingIcon.png'))}
            style={styles.navIcon}
            resizeMode='contain'
          />
          <Text style={styles.navText}>Listing</Text>
        </Pressable>

        <Pressable 
          onPress={() => scrollToRoom(3)} 
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
        >
          <Image
            source={(require('@/assets/images/main_dashboard/navigation_icon/MealPlanIcon.png'))}
            style={styles.navIcon}
            resizeMode='contain'
          />
          <Text style={styles.navText}>Meal Plan</Text>
        </Pressable>

        <Pressable 
          onPress={() => scrollToRoom(4)} 
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
        >
          <Image
            source={(require('@/assets/images/main_dashboard/navigation_icon/AIIcon.png'))}
            style={styles.navIcon}
            resizeMode='contain'
          />
          <Text style={styles.navText}>AI</Text>
        </Pressable>

      </BlurView>
      
    </View>
  );
}


const isTabletView = width >= 710;

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dashboardLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
  },

  // --- FIXED BACKGROUND STYLES ---
  gameArea: {
    flex: 1,
  },
  fixedBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  scrollLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  wallBackground: {
    flex: 0.85,
    backgroundColor: '#eecfa1',
    zIndex: 2,
  },
  brickSection: {
    flex: 0.75,
    width: '100%',
  },
  wainscotingSection: {
    flex: 0.35,
  },
  floorBackground: {
    flex: 0.10,
    overflow: 'hidden',
    backgroundColor: '#5c707d',
  },
  roomTwoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    gap: 10,
  },
  ceilingBackground: {
    flex: 0.05, 
    overflow: 'hidden',
    backgroundColor: '#2e1c10',
  },
  ceilingPerspective: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end', 
    transform: [
      { perspective: 800 },
      { rotateX: '-65deg' },
      { scaleY: 2 },
      { scaleX: 2 },
      { translateY: 100 }
    ],
  },
  woodenLinen: {
    height: 27,
    width: "100%"
  },
  floorPerspective: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    transform: [
      { perspective: 800 },
      { rotateX: '65deg' },
      { scaleY: 2 },
      { scaleX: 2 },
      { translateY: -100 }
    ],
  },

  // --- SWIPEABLE SCREEN STYLE ---
  scene: {
    flex: 1,
  },
  foregroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  foregroundLayerItem: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: height * 0.09,
  },
  foregroundLayerBoard: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.09,
  },
  foregroundLayerOven: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingLeft: 40,
    top: height * 0.09,
  },
  singleItemLayer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileStackLayer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  tabletGroupLayer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    paddingBottom: height * 0.05,
  },

  // ==============================
  // --- FUNCTIONAL ITEM STYLES ---
  // ==============================

  // --- ITEM STYLES (DOOR) ---
  doorWrapper: {
    width: width * 0.28,
    height: '60%',
    aspectRatio: 0.6,
  },
  doorImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (Fridge) ---
  fridgeWrapper: {
    height: '55%',
    aspectRatio: 0.6,
    zIndex: 1,
  },
  fridgeImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (Board) ---
  boardWrapper: {
    height: '38%',
    aspectRatio: 0.65,
    justifyContent: "center",
  },
  boardImage: {
    width: '100%',
    height: '100%',
    zIndex: 0,
  },

  // --- ITEM STYLES (Oven) ---
  ovenWrapper: {
    //width: width * 0.50,
    height: '60%',
    aspectRatio: 0.55,
    top: '2%',
    zIndex: 2
  },
  ovenImage: {
    width: '100%',
    height: '100%',
  },
  fireOverlayWrapper: {
    position: 'absolute',
    top: '14%',    
    left: '60%',  
    width: '10%', 
    height: '20%', 
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9
  },
  steamOverlayWrapper: {
    position: 'absolute',
    top: '-4%',    
    left: '52%',  
    width: '20%', 
    height: '20%', 
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steamImage: {
    width: '100%',
    height: '100%',
    opacity: 0.2
  },

  // --- ITEM STYLES (AI) ---
  AIWrapper: {
    height: '30%',
    aspectRatio: 0.6,
    bottom: '18%',
    right: '10%',
    zIndex: 2
  },
  AIImage: {
    width: '100%',
    height: '100%',
  },

  // ==========================
  // --- DESIGN ITEM STYLES ---
  // ==========================

  // --- Light Styles ---
  hangingLightWrapper:{
    height: "30%",
    aspectRatio: 1,
    position: "absolute",
    top: 0,
    zIndex: 1,
    shadowColor: '#ffffffff', 
    shadowOffset: { width: 0, height: 100 }, 
    shadowOpacity: 1,       
    shadowRadius: 100,         
    elevation: 0,
  },
  hangingLightImage: {
    width: '100%',
    height: '100%'
  },
  downwardBeamWrapper: {
    position: 'absolute',
    top: '20%',           
    width: width * 0.8,   
    height: '85%',        
    zIndex: 2,            
    opacity: 0.2,         
  },
  logoutWrapper: {
    position: 'absolute',
    top: '30%',
    width: '30%',
    height: "10%"
  },
  windowBeamWrapper: {
    position: 'absolute',
    top: '-10%',    
    right: "-30%",          
    height: '120%',    
    aspectRatio: 1,    
    zIndex: 2,            
    opacity: 0.2    
  },
  wideWindowBeamWrapper: {
    position: 'absolute',
    top: '-15%', 
    left: '-15%',             
    height: '130%',    
    aspectRatio: 1,    
    zIndex: 2,            
    opacity: 0.2    
  },
  beamImage: {
    width: '100%',
    height: '100%',
  },

  // --- Flower Pot Styles ---
  tallFlowerPotWrapper:{
    width: width * 0.8,
    height: "60%",
    position: "absolute",
    left: - (width * 0.70) / 2,
    bottom: '9%',
    zIndex: 1,
  },
  tallPotImage: {
    width: '100%',
    height: '100%'
  },
  mediumPotImage: {
    position: 'absolute',
    alignSelf: 'center', 
    height: "80%",
    bottom: height * 0.267,
    aspectRatio: 1,
    zIndex: 1,
  },
  smallFlowerPotImage: {
    position: 'absolute',
    bottom: '-18%',
    right: '15%',
    height: 200,
    width: 50,
    zIndex: 2,
  },
  smallFlowerPotImageTablet: {
    height: 260,
    width: 75,
  },

  // --- Cabinet Styles ---
  topCabinetWrapper: {
    position: 'absolute',
    top: '5%',
    height: "28%",
    aspectRatio: 2,
    zIndex: 0,
  },
  bottomCabinetWrapper: {
    width: width * 0.80,
    height: "30%",
    position: "absolute",
    right: - (width * 0.80) / 2,
    bottom: '9%',
    zIndex: 0,
  },
  longBottomCabinetWrapper: {
    position: 'absolute',
    left: '-10%',
    bottom: '-10%',
    height: '75%',
    aspectRatio: 1,
    zIndex: 1,
  },
  cabinetImage: {
    width: '100%',
    height: '100%',
  },
  hangingShelfWrapper: {
    position: "absolute",
    top: "-40%",
    height: "120%",
    width: "150%",
    zIndex: 1,
  },
  hangingShelfImage: {
    width: '100%',
    height: '100%',
  },

  // --- Fridge Decor ---
  fridgeTopRow: {
    flexDirection: 'row',
    width: "50%",         
    justifyContent: 'space-around', 
    alignItems: 'flex-end',   
    height: '10%',         
    top: 5,      
    zIndex: 2,    
  },
  fridgeTopImage: {
    width: '48%',                
    aspectRatio: 1,
  },
  windowWrapper: {
    position: 'absolute',
    right: -(width * 0.4) / 2,
    top: "35%",                   
    height: height * 0.3,     
    width: width * 0.4,
    zIndex: 0,
  },
  windowWrapperTablet: {
    height: height * 0.3,
    width: width * 0.35,
    right: -(width * 0.35) / 2
  },
  wideWindowWrapper: {
    position: 'absolute',
    top: "26%",                   
    height: height * 0.3,     
    aspectRatio: 1,
    zIndex: 0,
  },
  windowImage: {
    width: '100%',
    height: '100%',
  },
  viewContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden'
  },
  viewImage: {
    width: '100%',
    height: '100%',
  },

  // --- Listing Decor ---
  stickyNotesOverBoard: {
    position: 'absolute',
    height: '70%', 
    maxWidth: 200,
    bottom: '11%',
    alignSelf: 'center',
    zIndex: 1, 
  },
  boardTag: {
    position: 'absolute',
    top: '4%',           
    height: '15%',      
    width: '80%',       
    alignSelf: 'center',
    zIndex: 2,
  },
  boardNotes: {
    position: 'absolute',
    top: '30%',          
    height: '62%',       
    width: '85%',
    alignSelf: 'center',
    zIndex: 1, 
  },
  tableWrapper: {
    position: 'absolute',
    bottom: '8%',
    left: 0,
    height: '41%',
    aspectRatio: 1.8,
  },

  // ==========================
  // --- NAVIGATION BAR STYLES ---
  // ==========================
  bottomNavBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20, 
    alignSelf: 'center',
    width: '90%',
    maxWidth: 600,
    height: 70,
    borderRadius: 35, 
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '80%',
    marginHorizontal: 4, 
    borderRadius: 20,
  },
  navItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', 
    transform: [{ scale: 0.92 }], 
  },
  navIcon: {
    fontSize: 24, 
    width: isTabletView ? 30 : 20,
    height: isTabletView ? 30 : 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: isTabletView ? 15 : 12,
    color: '#FFFF',
  },
});