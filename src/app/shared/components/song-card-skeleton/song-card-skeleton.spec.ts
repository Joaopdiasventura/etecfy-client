import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongCardSkeleton } from './song-card-skeleton';

describe('SongCardSkeleton', () => {
  let component: SongCardSkeleton;
  let fixture: ComponentFixture<SongCardSkeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongCardSkeleton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongCardSkeleton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
