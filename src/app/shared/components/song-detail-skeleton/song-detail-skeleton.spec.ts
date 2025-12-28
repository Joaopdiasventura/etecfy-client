import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongDetailSkeleton } from './song-detail-skeleton';

describe('SongDetailSkeleton', () => {
  let component: SongDetailSkeleton;
  let fixture: ComponentFixture<SongDetailSkeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongDetailSkeleton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongDetailSkeleton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
