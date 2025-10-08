import React from 'react';

    import { View, Text, StyleSheet } from 'react-native';



  

    const EventosCard = (props) => {

      return (

        <View style={styles.card}>

          <Text style={styles.titulo}>{props.nome}</Text> 

          <Text style={styles.descricao}>{props.descricao}</Text> 

        </View>

      );

    };



    const styles = StyleSheet.create({

      card: {
        backgroundColor: '#D9C8FF',
        padding: 15,
        marginVertical: 10,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5, // Sombra para Android
        alignSelf: 'center',
        width: '90%',
        maxWidth: 400,
      },

      titulo: {

        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#7B2FFF',
        textAlign: 'center',

      },

      descricao: {

        fontSize: 14,
        textAlign:'center',
        color: '#666',

      },

    });



    export default EventosCard;