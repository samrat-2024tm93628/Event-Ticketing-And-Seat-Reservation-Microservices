package com.event.catalogservice.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.event.catalogservice.entity.Venue;

public interface VenueRepository extends JpaRepository<Venue, Integer> {
}
