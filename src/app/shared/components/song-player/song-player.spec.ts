import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongPlayer } from './song-player';

describe('SongPlayer', () => {
  let component: SongPlayer;
  let fixture: ComponentFixture<SongPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongPlayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
