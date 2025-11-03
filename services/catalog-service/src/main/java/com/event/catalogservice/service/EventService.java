package com.event.catalogservice.service;


import org.springframework.stereotype.Service;

import com.event.catalogservice.entity.Event;
import com.event.catalogservice.repository.EventRepository;

import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Optional<Event> getEventById(Integer id) {
        return eventRepository.findById(id);
    }

    public List<Event> getEventsByVenueId(Integer venueId) {
        return eventRepository.findByVenueVenueId(venueId);
    }

    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }
}

