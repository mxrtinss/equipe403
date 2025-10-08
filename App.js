import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView, Image } from "react-native";
import EventosCard from './components/EventosCard';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.container}>
          <Image source={require('./assets/logo.png')} style={styles.logo} />
          <Text style={styles.subTitle}>O guia de eventos perfeito para você!</Text>

          <EventosCard
            nome="Eventos próximos"
            descricao="Descubra os próximos eventos que acontecerão pertinho de você!"
          />
          <EventosCard
            nome="Criar um evento"
            descricao="Crie e organize eventos, faça as memórias acontecerem!"
          />
          <EventosCard
            nome="Seus eventos"
            descricao="Aqui você consulta aqueles eventos que já viraram memórias e aqueles que você quer ir!"
          />

          <StatusBar style="auto" />
        </View>
      </ScrollView>
      
      {/* Rodape da pagina */}
      <View style={styles.footer}>
        <View style={styles.footerOption}>
          <Image source={require('./assets/imagens_rodape/pagina-inicial.png')} style={styles.footerIcon} />
        </View>
        <View style={styles.footerOption}>
          <Image source={require('./assets/imagens_rodape/foto-perfil.png')} style={styles.footerIcon} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    paddingBottom: 245, 
    backgroundColor: '#f5f5f5',
  },
  container: {
    // para permitir que os cards se posicionem naturalmente.
    backgroundColor: '#f5f5f5', // Fundo claro para o app
    paddingTop: 50, // Espaço para a barra de status no topo
    alignItems: 'center', // Centraliza os filhos horizontalmente
  },
  
  subTitle: { // Estilo para o subtitulo 
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerOption: {
    alignItems: 'center',
    flex: 1,
  },
  footerIcon: {
    width: 35,
    height: 35,
    marginBottom: 2,
  },
});





