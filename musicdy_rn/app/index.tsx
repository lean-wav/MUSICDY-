import { Redirect } from 'expo-router';

// El index root solo es un punto ciego que delega a los Tabuladores o al Auth (eso lo ataja root layout)
export default function Index() {
    return <Redirect href="/(tabs)/" />;
}
