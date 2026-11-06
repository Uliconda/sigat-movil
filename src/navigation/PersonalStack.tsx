import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PersonalDetailScreen } from "../screens/PersonalDetailScreen";
import { PersonalFormScreen } from "../screens/PersonalFormScreen";
import { PersonalListScreen } from "../screens/PersonalListScreen";
import { BRAND } from "../theme/colors";
import type { PersonalStackParamList } from "../types";
import { MenuButton } from "./MainStack";

const Stack = createNativeStackNavigator<PersonalStackParamList>();

export function PersonalStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: BRAND.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="PersonalList"
        component={PersonalListScreen}
        options={({ navigation }) => ({
          title: "Personal administrativo",
          headerLeft: () => <MenuButton navigation={navigation} />,
        })}
      />
      <Stack.Screen name="PersonalDetalle" component={PersonalDetailScreen} options={{ title: "Personal" }} />
      <Stack.Screen name="PersonalForm" component={PersonalFormScreen} options={{ title: "Alta de personal" }} />
    </Stack.Navigator>
  );
}
