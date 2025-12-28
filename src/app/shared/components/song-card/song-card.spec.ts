import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongCard } from './song-card';

describe('SongCard', () => {
  let component: SongCard;
  let fixture: ComponentFixture<SongCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
