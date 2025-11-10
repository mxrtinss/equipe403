import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const EventosCard = (props) => {
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={props.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.titulo}>{props.nome}</Text> 
      <Text style={styles.descricao}>{props.descricao}</Text> 
    </TouchableOpacity>
  );
};



    const styles = StyleSheet.create({
      card: {
        backgroundColor: '#D9C8FF',
        padding: 20,
        marginVertical: 10,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        width: '100%',
        maxWidth: 400,
        minHeight: 120,
        justifyContent: 'center',
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