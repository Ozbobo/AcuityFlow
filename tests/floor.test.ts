import { describe, it, expect } from 'vitest';
import {
  ALL_ROOMS,
  createEmptyRooms,
  distance,
  getRoom,
  positionOf,
} from '../src/lib/floor';

describe('floor', () => {
  it('has 30 rooms total', () => {
    expect(ALL_ROOMS.length).toBe(30);
  });

  it('has 16 rooms in High Hall (915-930)', () => {
    const high = ALL_ROOMS.filter((n) => n >= 915 && n <= 930);
    expect(high.length).toBe(16);
  });

  it('has 14 rooms in Low Hall (901-914)', () => {
    const low = ALL_ROOMS.filter((n) => n >= 901 && n <= 914);
    expect(low.length).toBe(14);
  });

  it('createEmptyRooms returns 30 empty rooms', () => {
    const rooms = createEmptyRooms();
    expect(rooms.length).toBe(30);
    expect(rooms.every((r) => !r.occupied)).toBe(true);
    expect(rooms.every((r) => r.criticality === null)).toBe(true);
    expect(rooms.every((r) => r.assignedTo === null)).toBe(true);
  });

  it('positions 915/916 at the station (High side)', () => {
    expect(positionOf(915)).toBe(positionOf(916));
  });

  it('positions 901/902 at the station (Low side)', () => {
    expect(positionOf(901)).toBe(positionOf(902));
  });

  it('positions 915 and 901 are adjacent (distance 1)', () => {
    expect(distance(915, 901)).toBe(1);
  });

  it('positions 929/930 are the farthest in High Hall', () => {
    expect(positionOf(929)).toBe(0);
    expect(positionOf(930)).toBe(0);
  });

  it('positions 913/914 are the farthest in Low Hall', () => {
    expect(positionOf(913)).toBe(14);
    expect(positionOf(914)).toBe(14);
  });

  it('distance is symmetric', () => {
    expect(distance(915, 920)).toBe(distance(920, 915));
    expect(distance(901, 913)).toBe(distance(913, 901));
  });

  it('distance across hall (same pair) is 0', () => {
    expect(distance(915, 916)).toBe(0);
    expect(distance(901, 902)).toBe(0);
  });

  it('distance across station (915 to 901) is 1', () => {
    expect(distance(915, 901)).toBe(1);
  });

  it('distance across station (916 to 902) is 1', () => {
    expect(distance(916, 902)).toBe(1);
  });

  it('distance 929 to 914 is the maximum (end-to-end)', () => {
    expect(distance(929, 914)).toBe(14);
  });

  it('getRoom returns the room object by number', () => {
    const rooms = createEmptyRooms();
    const r = getRoom(rooms, 915);
    expect(r?.number).toBe(915);
    expect(r?.hall).toBe('high');
  });

  it('every room has a unique number', () => {
    const rooms = createEmptyRooms();
    const nums = new Set(rooms.map((r) => r.number));
    expect(nums.size).toBe(30);
  });

  it('paired rooms share a pairId', () => {
    const rooms = createEmptyRooms();
    const r915 = getRoom(rooms, 915)!;
    const r916 = getRoom(rooms, 916)!;
    expect(r915.pairId).toBe(r916.pairId);
    const r901 = getRoom(rooms, 901)!;
    const r902 = getRoom(rooms, 902)!;
    expect(r901.pairId).toBe(r902.pairId);
    expect(r915.pairId).not.toBe(r901.pairId);
  });
});
