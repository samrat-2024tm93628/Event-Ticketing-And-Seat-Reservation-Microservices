package com.event.catalogservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.event.catalogservice.entity.Event;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Integer> {
    List<Event> findByVenueVenueId(Integer venueId);
}
