import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NearbyEventCard = ({ event, onPress }) => {
    // Função para formatar a data
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.imageContainer}>
                {event.images && event.images[0] ? (
                    <Image
                        source={{ uri: event.images[0] }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="calendar-outline" size={40} color="#8B5CF6" />
                    </View>
                )}
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title} numberOfLines={2}>
                    {event.title}
                </Text>
                <Text style={styles.date}>
                    {formatDate(event.start)}
                </Text>
                <Text style={styles.location} numberOfLines={1}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    {event.location}
                </Text>
                <Text style={styles.description} numberOfLines={2}>
                    {event.description || 'Sem descrição disponível'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: 150,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    date: {
        fontSize: 14,
        color: '#8B5CF6',
        marginBottom: 4,
    },
    location: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    description: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
});

export default NearbyEventCard;