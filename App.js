import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import PontoTuristicoCard from './components/PontoTuristicoCard';

export default function App() {
  return (
    <ScrollView style={StyleSheet.ScrollViewContainer}>
      <View style={styles.container}>
      <Text style={styles.mainTitle}>Conheça Curitiba!</Text> 

    <PontoTuristicoCard

      nome="Jardim Botânico"

      descricao="Um dos mais famosos cartões-postais da cidade."

    />

    <PontoTuristicoCard

      nome="Ópera de Arame"

      descricao="Teatro com estrutura tubular e teto transparente, em meio à natureza."

    />

    <PontoTuristicoCard

      nome="Parque Tanguá"

      descricao="Antiga pedreira transformada em parque com cascata e mirante."

    />

    <PontoTuristicoCard

      nome="Museu Oscar Niemeyer"

      descricao="Conhecido como Museu do Olho, com arte moderna e contemporânea."

    />

    <StatusBar style="auto" />

    </View>

    <View style={styles.flexboxExample}>

      <View style={styles.box}><Text>1</Text></View>

      <View style={[styles.box, { backgroundColor: 'orange' }]}><Text>2</Text></View>

      <View style={styles.box}><Text>3</Text></View>

    </View>

    </ScrollView>

    

    

    );

    }

const styles = StyleSheet.create({
  scrollViewContainer: { // Estilo para o ScrollView
  flex: 1,
  backgroundColor: '#f5f5f5',
  },
  container: {
  // Remova 'justifyContent: center' e 'alignItems: center'

  // para permitir que os cards se posicionem naturalmente.
  flex: 1,
  backgroundColor: '#f5f5f5', // Fundo claro para o ap
  paddingTop: 50, // Espaço para a barra de status no topo
  },
  mainTitle: { // Novo estilo para o título principal
  fontSize: 28,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 20,
  color: '#333',

  flexboxExample: {

    flexDirection: 'row', // <--- Itens lado a lado (por padrão é 'column')

    justifyContent: 'space-around', // <--- Espaça itens uniformemente

    alignItems: 'center', // <--- Centraliza itens verticalmente

    backgroundColor: '#e0e0e0',

    padding: 10,

    margin: 20,

    borderRadius: 8,

  },

  box: {

    width: 50,

    height: 50,

    backgroundColor: 'lightblue',

    justifyContent: 'center',

    alignItems: 'center',

    margin: 5,

    borderRadius: 5,

  }

  

  }});

  



