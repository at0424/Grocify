import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// --- PIXEL ART PERSPECTIVE FLOOR ---
const CheckeredFloor = ({ containerWidth }: { containerWidth: number }) => {
  const rows = 14; 
  const cols = 12; 
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
        <View key={r} style={{ height: rowHeight, flexDirection: 'row', width: containerWidth * 2 }}>
            {rowBlocks}
        </View>
    );
  }

  return (
    <View style={styles.floorPerspective}>
      {grid}
    </View>
  );
};

// --- HELPER COMPONENT ---
const DashboardItem = ({ title, subTitle, onPress, extraStyle }: {title: string, subTitle: string, onPress: () => void, extraStyle?: any}) => (
  <TouchableOpacity style={[styles.itemWrapper, extraStyle]} onPress={onPress}>
    <View style={styles.placeholderBlock}>
      <Text style={styles.blockEmoji}>{extraStyle?.backgroundColor ? extraStyle.backgroundColor.substring(0, 1) : '🖼️'}</Text>
    </View>
    <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubTitle}>{subTitle}</Text>
    </View>
  </TouchableOpacity>
);

// --- MAIN DASHBOARD SCREEN ---
export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");
  const [isTabletView, setIsTabletView] = useState(Dimensions.get('window').width > 600);

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

  return (
    <View style={styles.container}>

      {/* --- GAME AREA (Holds Fixed Background + Swipeable Foreground) --- */}
      <View style={styles.gameArea}>
        
        {/* THE FIXED BACKGROUND */}
        <View style={styles.fixedBackgroundLayer}>
            
            <View style={styles.wallBackground}>
                <ImageBackground
                    source={require('@/assets/images/main_dashboard/BrickWall.png')}
                    style={styles.brickSection} 
                    resizeMode="repeat"
                />
                
                <ImageBackground
                    source={require('@/assets/images/main_dashboard/PlainWainscoting.png')}
                    style={styles.wainscotingSection} 
                    resizeMode="stretch"
                />

            </View>

            {/* THE FLOOR (Remains locked below the wall area) */}
            <View style={styles.floorBackground}>
              <CheckeredFloor containerWidth={width} />
            </View>
          </View>

        {/* THE SWIPEABLE FOREGROUND */}
        <ScrollView 
          horizontal 
          pagingEnabled={false} 
          snapToInterval={sceneWidth} 
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={styles.scrollLayer}
        >
          
          {/* ROOM 1: Door */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>
                
                <TouchableOpacity 
                    // onPress={handleSignOut} 
                    style={styles.doorWrapper}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={require('@/assets/images/main_dashboard/Door.png')}
                        style={styles.doorImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

            </View>
          </View>

          {/* ROOM 2: Fridge */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>
                
                <TouchableOpacity 
                    onPress={() => router.push('./(freshness)')} 
                    style={styles.fridgeWrapper}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={require('@/assets/images/main_dashboard/Fridge.png')}
                        style={styles.fridgeImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

            </View>
          </View>

          {/* ROOM 3: Listing */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerBoard]}>
                
                <TouchableOpacity 
                    onPress={() => router.push('./(listing)')} 
                    style={styles.boardWrapper}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={require('@/assets/images/main_dashboard/Board.png')}
                        style={styles.boardImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

            </View>
          </View>

          {/* ROOM 4: Meal Plan */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerOven]}>
                
                <TouchableOpacity 
                    onPress={() => router.push('./(meal_plan)')} 
                    style={styles.ovenWrapper}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={require('@/assets/images/main_dashboard/Oven.png')}
                        style={styles.ovenImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

            </View>
          </View>

          {/* ROOM 5: AI */}
          <View style={[styles.scene, { width: sceneWidth }]}>
            <View style={[styles.foregroundLayer, styles.foregroundLayerItem]}>
                
                <TouchableOpacity 
                    onPress={() => router.push('./(ai)')} 
                    style={styles.AIWrapper}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={require('@/assets/images/main_dashboard/AI.png')}
                        style={styles.AIImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

            </View>
          </View>

        </ScrollView>

      </View>
    </View>
  );
}

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
    flex: 0.90, 
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
  
  // --- ITEM STYLES (DOOR) ---
  doorWrapper: {
    width: width * 0.28, 
    height: '70%',
    aspectRatio: 0.6, 
  },
  doorImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (Fridge) ---
  fridgeWrapper: {
    width: width * 0.45, 
    height: '65%',
    aspectRatio: 0.6
  },
  fridgeImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (Board) ---
  boardWrapper: {
    width: width * 0.20, 
    height: '40%',
    aspectRatio: 0.6,
  },
  boardImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (Oven) ---
  ovenWrapper: {
    width: width * 0.50, 
    height: '60%',
    aspectRatio: 0.6,
    top: 15
  },
  ovenImage: {
    width: '100%',
    height: '100%',
  },

  // --- ITEM STYLES (AI) ---
  AIWrapper: {
    width: width * 0.25, 
    height: '50%',
    aspectRatio: 0.6,
    top: 20
  },
  AIImage: {
    width: '100%',
    height: '100%',
  },

  // --- TEMPLATE DASHBOARD BLOCKS ---
  itemWrapper: {
    width: width * 0.40, 
    alignItems: 'center',
    gap: 10,
  },
  placeholderBlock: {
    width: '100%',
    height: 120, 
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: '#333', 
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  blockEmoji: { fontSize: 32 },
  itemTextContainer: { alignItems: 'center' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  itemSubTitle: { fontSize: 12, color: '#666', textAlign: 'center' },
  
  /* CUSTOM STYLING */
  itemLogout: { backgroundColor: '#ffb3b3', width: 140 },
  itemFridge: { backgroundColor: '#add8e6' },
  itemNotes: { backgroundColor: '#ffebcd' },
  itemPan: { backgroundColor: '#ffb347' },
  itemAI: { backgroundColor: '#fffacd' }
});